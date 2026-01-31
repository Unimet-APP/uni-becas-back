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
const ApiError = require('../utils/ApiError');
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
   */
  async iniciarTestIco(usuarioId) {
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

    const registrosRespuesta = respuestas.map((r) => {
      const pregunta = preguntasMap[r.pregunta_id];
      const respuestaBool = r.respuesta === true || r.respuesta === 'true' || r.respuesta === 1;
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
      };
    });

    await RespuestasTestOrientacion.bulkCreate(registrosRespuesta);

    const respuestasGuardadas = await RespuestasTestOrientacion.findAll({
      where: { sesion_id: sesionId },
      attributes: ['pregunta_id', 'respuesta'],
    });

    const puntuaciones = await testOrientacionService.calcularPuntuaciones(
      respuestasGuardadas.map((r) => ({
        pregunta_id: r.pregunta_id,
        respuesta: r.respuesta,
        preguntaId: r.pregunta_id,
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
    try {
      const respuestaLLM = await llmService.generarRecomendacionesICO(puntuaciones, codigoHolland, CARRERAS_UNIMET, trayectoriaParaLLM);
      analisisLLM = parsearRespuestaLLMICO(respuestaLLM);
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
        return {
          nombre: nombreCarrera,
          name: nombreCarrera,
          razon: rec.razon || rec.razón || '',
          facultad: spec ? (spec.faculty || '') : '',
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

    return {
      resultado,
      puntuaciones,
      codigoHolland,
      perfil_dominante: perfiles.dominante,
      perfil_secundario: perfiles.secundario,
      analisis_llm: analisisLLM,
      recomendacionesCarreras: analisisLLM.carrerasRecomendadas || [],
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
