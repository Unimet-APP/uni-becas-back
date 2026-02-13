'use strict';

/**
 * Servicio para el test ICO (Inventario de Orientación - una sola ronda).
 * Flujo: iniciar sesión → obtener todas las preguntas → guardar respuestas → calcular resultado y LLM.
 * No modifica el flujo Holland RIASEC (ronda 1 / ronda 2) existente.
 */

const {
  SesionesTestOrientacion,
  RespuestasTestOrientacion,
  ResultadosOrientacion,
  PreguntasOrientacion,
} = require('../models');
const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');
const helpers = require('../utils/helpers');
const testOrientacionService = require('./testOrientacionService');
const llmService = require('./llmService');
const trayectoriaAcademicaService = require('./trayectoriaAcademicaService');
const { CARRERAS_UNIMET } = require('../config/carrerasUnimetSpecs');

const TIPO_TEST_ICO = 'ICO';
const DIMENSIONES_RIASEC = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];

function calcularCodigoHolland(puntuaciones) {
  const mapeo = {
    Realista: 'R',
    Investigador: 'I',
    Artístico: 'A',
    Social: 'S',
    Emprendedor: 'E',
    Convencional: 'C',
  };
  return Object.entries(puntuaciones)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 3)
    .map(([dim]) => mapeo[dim] || dim[0])
    .join('');
}

function obtenerPerfilesDominantes(puntuaciones) {
  const ordenadas = Object.entries(puntuaciones).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  return {
    dominante: ordenadas[0]?.[0] || 'N/A',
    secundario: ordenadas[1]?.[0] || 'N/A',
  };
}

function parsearRespuestaLLMICO(texto) {
  try {
    let jsonText = texto;
    const codeBlockMatch = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1].trim();
    else {
      const jsonMatches = texto.match(/\{[\s\S]*\}/g);
      if (jsonMatches?.length) jsonText = jsonMatches.reduce((a, b) => (a.length > b.length ? a : b));
    }
    return JSON.parse(jsonText.trim());
  } catch (e) {
    console.warn('[ICO] Error parseando respuesta LLM:', e.message);
    return {
      perfilVocacional: { resumen: '', fortalezas: [], areasExplorar: [] },
      carrerasRecomendadas: [],
      sugerenciasAcompanamiento: [],
    };
  }
}

class IcoOrientacionService {
  /**
   * Inicia una sesión del test ICO para un usuario.
   * Solo puede haber un ICO por usuario: si ya tiene resultado ICO, no se crea sesión.
   */
  async iniciarTestIco(usuarioId) {
    let yaTieneResultadoIco = false;
    try {
      const existente = await ResultadosOrientacion.findOne({
        where: { usuario_id: usuarioId, tipo_test: TIPO_TEST_ICO },
      });
      yaTieneResultadoIco = !!existente;
    } catch (errConsulta) {
      // Si falla la consulta (tabla/BD), no bloquear: permitir crear sesión
      console.warn('[ICO.iniciarTestIco] No se pudo verificar resultado previo:', errConsulta?.message || errConsulta);
    }
    if (yaTieneResultadoIco) {
      throw new ApiError(403, 'Ya completaste el test ICO. Solo puedes realizar un test ICO.');
    }

    const sesion = await SesionesTestOrientacion.create({
      usuario_id: usuarioId,
      tipo_test: TIPO_TEST_ICO,
      estado: 'iniciada',
      seed_aleatorio: `${Date.now()}-${Math.random()}`,
      fecha_inicio: new Date(),
    });
    return sesion;
  }

  /**
   * Devuelve todas las preguntas del test ICO (una sola “ronda”).
   */
  async obtenerPreguntasIco(sesionId) {
    const sesion = await SesionesTestOrientacion.findByPk(sesionId);
    if (!sesion) throw new ApiError(404, 'Sesión no encontrada');
    if (sesion.tipo_test !== TIPO_TEST_ICO) throw new ApiError(400, 'La sesión no es de tipo ICO');
    if (sesion.estado !== 'iniciada') throw new ApiError(400, 'La sesión ya no está en estado iniciada');

    const preguntas = await PreguntasOrientacion.findAll({
      where: { tipo_test: TIPO_TEST_ICO, activa: true },
      order: [
        ['dimension_principal', 'ASC'],
        ['codigo_pregunta', 'ASC'],
      ],
      attributes: ['id', 'codigo_pregunta', 'dimension_principal', 'texto__pregunta', 'tipo_pregunta', 'peso_pregunta', 'instrucciones_respuesta'],
    });
    return preguntas;
  }

  /**
   * Guarda todas las respuestas del test ICO, calcula puntuaciones, llama al LLM y persiste el resultado.
   * Respuestas: [{ pregunta_id, respuesta: true|false }, ...]
   */
  async guardarRespuestasIcoYFinalizar(sesionId, respuestas) {
    const sesion = await SesionesTestOrientacion.findByPk(sesionId);
    if (!sesion) throw new ApiError(404, 'Sesión no encontrada');
    if (sesion.tipo_test !== TIPO_TEST_ICO) throw new ApiError(400, 'La sesión no es de tipo ICO');
    if (sesion.estado !== 'iniciada') throw new ApiError(400, 'La sesión ya fue finalizada o no está en estado iniciada');

    const preguntaIds = respuestas.map((r) => r.pregunta_id);
    const preguntas = await PreguntasOrientacion.findAll({
      where: { id: preguntaIds, tipo_test: TIPO_TEST_ICO },
    });
    const preguntasMap = Object.fromEntries(preguntas.map((p) => [p.id, p]));

    // Mapeo Likert: acepta string ('Frecuentemente','A veces','Nunca') o número (2,1,0)
    const LIKERT_MAP = { 'Frecuentemente': 2, 'A veces': 1, 'Nunca': 0 };

    const registrosRespuesta = respuestas.map((r) => {
      const pregunta = preguntasMap[r.pregunta_id];

      // Calcular valor Likert (2/1/0)
      let valorLikert;
      if (typeof r.respuesta === 'number' && [0, 1, 2].includes(r.respuesta)) {
        valorLikert = r.respuesta;
      } else if (typeof r.respuesta === 'string' && LIKERT_MAP[r.respuesta] !== undefined) {
        valorLikert = LIKERT_MAP[r.respuesta];
      } else {
        // Backward compat: boolean o string boolean
        const esBool = r.respuesta === true || r.respuesta === 'true' || r.respuesta === 1;
        valorLikert = esBool ? 2 : 0;
      }

      const respuestaBool = valorLikert > 0;

      return {
        sesion_id: sesionId,
        pregunta_id: r.pregunta_id,
        usuario_id: sesion.usuario_id,
        ronda: 1,
        respuesta: respuestaBool,
        respuesta_correcta: true,
        dimension_predicha: pregunta?.dimension_principal || 'N/A',
        tiempo_respuesta: typeof r.tiempo_respuesta === 'number' ? r.tiempo_respuesta : 0,
        nivel_seguridad: r.nivel_seguridad === 'no_seguro' ? 'no_seguro' : 'seguro',
        valor_likert: valorLikert,
      };
    });

    await RespuestasTestOrientacion.bulkCreate(registrosRespuesta);

    const respuestasGuardadas = await RespuestasTestOrientacion.findAll({
      where: { sesion_id: sesionId },
      attributes: ['pregunta_id', 'respuesta', 'valor_likert'],
    });

    const puntuaciones = await testOrientacionService.calcularPuntuaciones(
      respuestasGuardadas.map((r) => ({
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        preguntaId: r.pregunta_id,
        valor_likert: r.valor_likert,
      })),
      TIPO_TEST_ICO
    );

    const codigoHolland = calcularCodigoHolland(puntuaciones);
    const perfiles = obtenerPerfilesDominantes(puntuaciones);

    let trayectoriaParaLLM = {};
    try {
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(sesion.usuario_id);
      if (trayectoria) {
        trayectoriaParaLLM = {
          promedio_general: trayectoria.promedio_general_acumulado != null ? Number(trayectoria.promedio_general_acumulado) : null,
          grado_actual: trayectoria.grado_actual || null,
          materias_destacadas: trayectoria.materias_destacadas || [],
          actividades_extracurriculares: trayectoria.actividades_extracurriculares || [],
          proyectos_realizados: trayectoria.proyectos_realizados || [],
          promedios_por_ano: trayectoria.promedios_por_ano || {},
          materias_por_ano_lapso: trayectoria.materias_por_ano_lapso || {},
          materias_por_area: trayectoria.materias_por_area || [],
        };
      }
    } catch (err) {
      console.warn('[ICO] No se pudo cargar trayectoria escolar para recomendaciones:', err.message);
    }

    let analisisLLM = {
      perfilVocacional: {},
      carrerasRecomendadas: [],
      sugerenciasAcompanamiento: [],
    };
    let respuestaGemini = null;
    let validacionHuggingface = null;
    let validacionHuggingfaceError = null;
    let validacionGrok = null;
    let validacionGrokError = null;
    const useHf = process.env.USE_HUGGINGFACE_VALIDATION === 'true';
    const useGrok = process.env.USE_GROK_VALIDATION === 'true';
    const useAutoconsistencia = process.env.VALIDAR_AUTOCONSISTENCIA_LLM === 'true';
    let validacionGemini2 = null;
    let validacionHuggingface2 = null;
    try {
      if (useHf || useGrok || useAutoconsistencia) {
        const out = await llmService.generarRecomendacionesICOConValidacion(
          puntuaciones, codigoHolland, CARRERAS_UNIMET, trayectoriaParaLLM
        );
        respuestaGemini = out.respuestaGemini;
        validacionGemini2 = out.respuestaGemini2 ?? null;
        validacionHuggingface = out.respuestaHuggingface ?? null;
        validacionHuggingface2 = out.respuestaHuggingface2 ?? null;
        validacionHuggingfaceError = out.errorHuggingface ?? null;
        validacionGrok = out.respuestaGrok ?? null;
        validacionGrokError = out.errorGrok ?? null;
      } else {
        respuestaGemini = await llmService.generarRecomendacionesICO(
          puntuaciones, codigoHolland, CARRERAS_UNIMET, trayectoriaParaLLM
        );
      }
      analisisLLM = parsearRespuestaLLMICO(respuestaGemini);
      // Enriquecer cada carrera: nombre, name (compat), razon, facultad, area — para que el front muestre título (carrera + facultad) y descripción
      const normalizar = (s) =>
        (s || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      const carrerasPorNombre = Object.fromEntries(
        CARRERAS_UNIMET.map((c) => [normalizar(c.name), c])
      );
      analisisLLM.carrerasRecomendadas = (analisisLLM.carrerasRecomendadas || []).map((rec) => {
        const nombreCarrera = (rec.nombre || rec.name || '').trim() || 'Carrera recomendada';
        const spec = carrerasPorNombre[normalizar(nombreCarrera)];
        const facultyRaw = spec ? (spec.faculty || '') : '';
        return {
          nombre: nombreCarrera,
          name: nombreCarrera,
          razon: rec.razon || rec.razón || '',
          facultad: helpers.normalizarFacultadParaDisplay(facultyRaw),
          area: spec ? (spec.area || '') : '',
        };
      });
    } catch (err) {
      console.error('[ICO] Error al llamar LLM:', err.message);
    }

    const resultado = await ResultadosOrientacion.create({
      sesion_id: sesionId,
      usuario_id: sesion.usuario_id,
      tipo_test: TIPO_TEST_ICO,
      puntuaciones_finales: puntuaciones,
      codigo_holland: codigoHolland,
      perfil_dominante: perfiles.dominante,
      perfil_secundario: perfiles.secundario,
      nivel_confianza_general: null,
      analisis_llm: analisisLLM,
      recomendaciones_carreras: analisisLLM.carrerasRecomendadas || [],
      perfil_vocacional: analisisLLM.perfilVocacional || {},
      trayectoria_academica_analizada: trayectoriaParaLLM,
      areas_desarrollo: [],
      sugerencias_acompanamiento: analisisLLM.sugerenciasAcompanamiento || [],
      plan_desarrollo: {},
      version_analisis: '1.0',
      fecha_generacion: new Date(),
    });

    await sesion.update({ estado: 'finalizada', fecha_completada: new Date() });

    // Guardar en archivo: respuesta de Gemini + validación (HF/Grok) para verlas en output/validacion-llm-ultimo.json
    if (respuestaGemini != null) {
      try {
        const outputDir = path.join(__dirname, '..', '..', 'output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, 'validacion-llm-ultimo.json');
        let geminiParaArchivo = respuestaGemini;
        let gemini2ParaArchivo = validacionGemini2;
        let hfParaArchivo = validacionHuggingface;
        let hf2ParaArchivo = validacionHuggingface2;
        let grokParaArchivo = validacionGrok;
        try {
          if (typeof respuestaGemini === 'string') geminiParaArchivo = JSON.parse(respuestaGemini);
        } catch (_) {
          geminiParaArchivo = respuestaGemini;
        }
        try {
          if (typeof validacionGemini2 === 'string') gemini2ParaArchivo = JSON.parse(validacionGemini2);
        } catch (_) {
          gemini2ParaArchivo = validacionGemini2;
        }
        try {
          if (typeof validacionHuggingface === 'string') hfParaArchivo = JSON.parse(validacionHuggingface);
        } catch (_) {}
        try {
          if (typeof validacionHuggingface2 === 'string') hf2ParaArchivo = JSON.parse(validacionHuggingface2);
        } catch (_) {}
        try {
          if (typeof validacionGrok === 'string') grokParaArchivo = JSON.parse(validacionGrok);
        } catch (_) {}
        const contenido = {
          timestamp: new Date().toISOString(),
          respuestaGemini: geminiParaArchivo ?? String(respuestaGemini ?? ''),
          respuestaGemini2: gemini2ParaArchivo ?? validacionGemini2 ?? null,
          validacionHuggingface: hfParaArchivo,
          validacionHuggingface2: hf2ParaArchivo ?? validacionHuggingface2 ?? null,
          validacionHuggingfaceError: validacionHuggingfaceError,
          validacionGrok: grokParaArchivo,
          validacionGrokError: validacionGrokError,
        };
        fs.writeFileSync(outputPath, JSON.stringify(contenido, null, 2), 'utf8');
        console.log('[ICO] Resultado Gemini + validación guardado en:', outputPath);
      } catch (err) {
        console.warn('[ICO] No se pudo guardar validacion-llm-ultimo.json:', err?.message);
      }
    }

    return {
      resultado,
      puntuaciones,
      codigoHolland,
      perfil_dominante: perfiles.dominante,
      perfil_secundario: perfiles.secundario,
      analisis_llm: analisisLLM,
      recomendacionesCarreras: analisisLLM.carrerasRecomendadas || [],
      // Validación Hugging Face (cuando USE_HUGGINGFACE_VALIDATION=true)
      validacion_huggingface: validacionHuggingface,
      validacion_huggingface_error: validacionHuggingfaceError,
      // Validación Grok (cuando USE_GROK_VALIDATION=true; Grok se deja para probar más adelante)
      validacion_grok: validacionGrok,
      validacion_grok_error: validacionGrokError,
    };
  }

  /**
   * Obtiene el resultado de una sesión ICO ya finalizada.
   */
  async obtenerResultadoIco(sesionId) {
    const sesion = await SesionesTestOrientacion.findByPk(sesionId);
    if (!sesion) throw new ApiError(404, 'Sesión no encontrada');
    if (sesion.tipo_test !== TIPO_TEST_ICO) throw new ApiError(400, 'La sesión no es de tipo ICO');

    const resultado = await ResultadosOrientacion.findOne({
      where: { sesion_id: sesionId },
    });
    if (!resultado) throw new ApiError(404, 'No hay resultado para esta sesión ICO');
    return resultado;
  }
}

module.exports = new IcoOrientacionService();
