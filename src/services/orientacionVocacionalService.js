const {
  SesionTestOrientacion,
  RespuestaTestOrientacion,
  ResultadoOrientacion,
  Usuario,
  Career,
} = require('../models');
const ApiError = require('../utils/ApiError');
const llmService = require('./llmService');
const testOrientacionService = require('./testOrientacionService');
const trayectoriaAcademicaService = require('./trayectoriaAcademicaService');
const bancoPreguntasService = require('./bancoPreguntasService');

class OrientacionVocacionalService {
  /**
   * Procesa un test completado y genera recomendaciones con LLM
   * @param {string} sesionId - ID de la sesión completada
   * @returns {Promise<Object>} - Resultado completo con recomendaciones
   */
  async procesarTestCompletado(sesionId) {
    try {
      // 1. Obtener sesión con relaciones
      const sesion = await SesionTestOrientacion.findByPk(sesionId, {
        include: [
          {
            model: RespuestaTestOrientacion,
            as: 'respuestas',
          },
          {
            model: Usuario,
            as: 'usuario',
          },
        ],
      });

      if (!sesion) {
        throw new ApiError(404, 'Sesión no encontrada');
      }

      if (sesion.estado !== 'ronda_2_completada') {
        throw new ApiError(400, 'La sesión debe estar en estado ronda_2_completada');
      }

      // 2. Calcular puntuaciones finales
      const puntuacionesFinales = testOrientacionService.calcularPuntuacionesFinales(
        sesion.puntuaciones_ronda_1 || {},
        sesion.puntuaciones_ronda_2 || {},
        {} // factoresCorreccion se calcularían aquí si fuera necesario
      );

      // 3. Obtener trayectoria académica
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(
        sesion.usuario_id
      );

      // 4. Obtener carreras disponibles
      const carreras = await Career.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'description', 'profile', 'job_field', 'faculty', 'area'],
      });

      // 5. Construir prompt para LLM
      const prompt = this.construirPromptAnalisis(sesion, puntuacionesFinales, trayectoria, carreras);

      // 6. Generar análisis con LLM
      const respuestaLLM = await llmService.generarRespuesta(prompt);
      const analisisLLM = this.parsearRespuestaLLM(respuestaLLM);

      // 7. Calcular código Holland y perfiles
      const codigoHolland = this.calcularCodigoHolland(puntuacionesFinales);
      const perfiles = this.obtenerPerfilesDominantes(puntuacionesFinales);

      // 8. Crear resultado
      const resultado = await ResultadoOrientacion.create({
        sesion_id: sesionId,
        usuario_id: sesion.usuario_id,
        tipo_test: sesion.tipo_test,
        puntuaciones_finales: puntuacionesFinales,
        codigo_holland: codigoHolland,
        perfil_dominante: perfiles.dominante,
        perfil_secundario: perfiles.secundario,
        nivel_confianza_general: this.calcularNivelConfianzaGeneral(
          sesion.puntuaciones_ronda_1 || {},
          sesion.puntuaciones_ronda_2 || {}
        ),
        analisis_llm: analisisLLM,
        recomendaciones_carreras: analisisLLM.carrerasRecomendadas || [],
        perfil_vocacional: analisisLLM.perfilVocacional || {},
        trayectoria_academica_analizada: trayectoria ? {
          carrera: trayectoria.carrera_id,
          trimestre: trayectoria.trimestre,
          iaa: trayectoria.iaa,
          asignaturas_aprobadas: trayectoria.asignaturas_aprobadas,
          asignaturas_por_area: trayectoria.asignaturas_por_area,
        } : {},
        areas_desarrollo: analisisLLM.areasDesarrollo || [],
        sugerencias_acompanamiento: analisisLLM.sugerenciasAcompanamiento || [],
        plan_desarrollo: analisisLLM.planDesarrollo || {},
        factor_correccion_aplicado: {},
        version_analisis: '1.0',
        fecha_generacion: new Date(),
      });

      // 9. Finalizar sesión
      await sesion.finalizar();

      // 10. Actualizar efectividad de preguntas usadas
      await this.actualizarEfectividadPreguntas(sesion);

      return resultado;
    } catch (error) {
      console.error('Error en procesarTestCompletado:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al procesar test completado: ${error.message}`);
    }
  }

  /**
   * Construye el prompt completo para el análisis del LLM
   * @param {Object} sesion - Sesión del test
   * @param {Object} puntuaciones - Puntuaciones finales
   * @param {Object} trayectoria - Trayectoria académica
   * @param {Array} carreras - Carreras disponibles
   * @returns {string} - Prompt completo
   */
  construirPromptAnalisis(sesion, puntuaciones, trayectoria, carreras) {
    const perfilEstudiante = this.formatearPerfilEstudiante(trayectoria);
    const resultadosTest = this.formatearResultadosTest(sesion, puntuaciones);
    const carrerasFormateadas = this.formatearCarreras(carreras);

    return `Eres un orientador vocacional experto de la Universidad Metropolitana.

PERFIL DEL ESTUDIANTE:
${perfilEstudiante}

RESULTADOS DEL TEST DE ORIENTACIÓN:
${resultadosTest}

CARRERAS DISPONIBLES EN LA UNIVERSIDAD:
${carrerasFormateadas}

TAREA:
1. Analiza el perfil vocacional del estudiante integrando:
   - Resultados del test de orientación (${sesion.tipo_test})
   - Trayectoria académica (rendimiento, áreas de fortaleza)
   - Intereses y habilidades manifestadas

2. Genera recomendaciones de carreras con:
   - Puntuación de compatibilidad (0-100)
   - Razones específicas del match
   - Áreas de desarrollo necesarias
   - Proyección de éxito académico

3. Proporciona un análisis personalizado que incluya:
   - Fortalezas identificadas
   - Áreas de mejora
   - Sugerencias de acompañamiento
   - Plan de desarrollo vocacional

FORMATO DE RESPUESTA (JSON):
{
  "analisisGeneral": "análisis general del perfil vocacional",
  "perfilVocacional": {
    "intereses": ["interés1", "interés2"],
    "habilidades": ["habilidad1", "habilidad2"],
    "valores": ["valor1", "valor2"],
    "codigoHolland": "${this.calcularCodigoHolland(puntuaciones)}"
  },
  "carrerasRecomendadas": [
    {
      "carreraId": 1,
      "nombre": "nombre de la carrera",
      "puntuacion": 85,
      "nivelMatch": "alto|medio|bajo",
      "razones": ["razón1", "razón2"],
      "areasDesarrollo": ["área1", "área2"],
      "proyeccionExito": "alta|media|baja"
    }
  ],
  "sugerenciasAcompanamiento": ["sugerencia1", "sugerencia2"],
  "planDesarrollo": {
    "cortoPlazo": ["acción1", "acción2"],
    "medianoPlazo": ["acción1", "acción2"],
    "largoPlazo": ["acción1", "acción2"]
  },
  "areasDesarrollo": ["área1", "área2"]
}`;
  }

  /**
   * Formatea el perfil del estudiante para el prompt
   * @private
   */
  formatearPerfilEstudiante(trayectoria) {
    if (!trayectoria) {
      return 'No hay información académica disponible.';
    }

    const carrera = trayectoria.carrera ? `Carrera: ${trayectoria.carrera.name || 'No especificada'}` : 'Carrera: No especificada';
    const trimestre = trayectoria.trimestre ? `Trimestre: ${trayectoria.trimestre}` : 'Trimestre: No especificado';
    const iaa = trayectoria.iaa ? `IAA: ${trayectoria.iaa}` : 'IAA: No especificado';
    const asignaturas = trayectoria.asignaturas_aprobadas ? `Asignaturas aprobadas: ${trayectoria.asignaturas_aprobadas}` : '';

    let areas = '';
    if (trayectoria.asignaturas_por_area && Object.keys(trayectoria.asignaturas_por_area).length > 0) {
      areas = `\nRendimiento por área:\n${Object.entries(trayectoria.asignaturas_por_area)
        .map(([area, cantidad]) => `  - ${area}: ${cantidad} asignaturas`)
        .join('\n')}`;
    }

    return `${carrera}\n${trimestre}\n${iaa}\n${asignaturas}${areas}`;
  }

  /**
   * Formatea los resultados del test para el prompt
   * @private
   */
  formatearResultadosTest(sesion, puntuaciones) {
    const dimensiones = Object.keys(puntuaciones);
    const resultados = dimensiones
      .map((dim) => `  - ${dim}: ${puntuaciones[dim]}/100`)
      .join('\n');

    let ambiguedades = '';
    if (sesion.areas_ambiguedad && sesion.areas_ambiguedad.length > 0) {
      ambiguedades = `\nÁreas con ambigüedad detectada: ${sesion.areas_ambiguedad.join(', ')}`;
    }

    let discrepancias = '';
    if (sesion.discrepancias_detectadas && sesion.discrepancias_detectadas.length > 0) {
      discrepancias = `\nDiscrepancias detectadas: ${sesion.discrepancias_detectadas.length} discrepancias entre test y trayectoria académica`;
    }

    return `Puntuaciones por dimensión:\n${resultados}${ambiguedades}${discrepancias}`;
  }

  /**
   * Formatea las carreras para el prompt
   * @private
   */
  formatearCarreras(carreras) {
    if (!carreras || carreras.length === 0) {
      return 'No hay carreras disponibles.';
    }

    return carreras
      .map((c) => {
        return `- ${c.name} (ID: ${c.id})
  Facultad: ${c.faculty || 'No especificada'}
  Área: ${c.area || 'No especificada'}
  Descripción: ${c.description || 'No disponible'}
  Perfil: ${c.profile || 'No disponible'}
  Campo laboral: ${c.job_field || 'No disponible'}`;
      })
      .join('\n\n');
  }

  /**
   * Parsea la respuesta del LLM a JSON estructurado
   * @private
   */
  parsearRespuestaLLM(respuestaTexto) {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Si no hay JSON, intentar parseo más flexible
      return {
        analisisGeneral: respuestaTexto,
        perfilVocacional: {},
        carrerasRecomendadas: [],
        sugerenciasAcompanamiento: [],
        planDesarrollo: {},
        areasDesarrollo: [],
        formato: 'texto',
      };
    } catch (error) {
      console.error('Error al parsear respuesta LLM:', error);
      return {
        analisisGeneral: respuestaTexto,
        perfilVocacional: {},
        carrerasRecomendadas: [],
        sugerenciasAcompanamiento: [],
        planDesarrollo: {},
        areasDesarrollo: [],
        error: 'No se pudo parsear a JSON',
      };
    }
  }

  /**
   * Calcula el código Holland (top 3 dimensiones)
   * @private
   */
  calcularCodigoHolland(puntuaciones) {
    const mapeo = {
      Realista: 'R',
      Investigador: 'I',
      Artístico: 'A',
      Social: 'S',
      Emprendedor: 'E',
      Convencional: 'C',
    };

    const ordenadas = Object.entries(puntuaciones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return ordenadas.map(([dimension]) => mapeo[dimension] || dimension[0]).join('');
  }

  /**
   * Obtiene perfiles dominante y secundario
   * @private
   */
  obtenerPerfilesDominantes(puntuaciones) {
    const ordenadas = Object.entries(puntuaciones).sort((a, b) => b[1] - a[1]);

    return {
      dominante: ordenadas[0]?.[0] || null,
      secundario: ordenadas[1]?.[0] || null,
    };
  }

  /**
   * Calcula nivel de confianza general
   * @private
   */
  calcularNivelConfianzaGeneral(puntuacionesRonda1, puntuacionesRonda2) {
    // Calcular consistencia entre rondas
    let diferenciaTotal = 0;
    let contador = 0;

    for (const dimension in puntuacionesRonda1) {
      const ronda1 = puntuacionesRonda1[dimension] || 0;
      const ronda2 = puntuacionesRonda2[dimension] || 0;
      diferenciaTotal += Math.abs(ronda1 - ronda2);
      contador++;
    }

    const diferenciaPromedio = contador > 0 ? diferenciaTotal / contador : 0;
    // Menor diferencia = mayor confianza
    const confianza = Math.max(0, Math.min(100, 100 - diferenciaPromedio));

    return Math.round(confianza);
  }

  /**
   * Actualiza efectividad de preguntas usadas
   * @private
   */
  async actualizarEfectividadPreguntas(sesion) {
    try {
      const todasPreguntasIds = [
        ...(sesion.preguntas_ronda_1 || []),
        ...(sesion.preguntas_ronda_2 || []),
      ];

      // Obtener resultado para comparar predicciones
      const resultado = await ResultadoOrientacion.findOne({
        where: { sesion_id: sesion.id },
      });

      if (!resultado) {
        return; // No hay resultado aún, no podemos calcular efectividad
      }

      const perfilReal = resultado.perfil_dominante;

      // Actualizar efectividad de cada pregunta
      for (const preguntaId of todasPreguntasIds) {
        const pregunta = await require('../models').PreguntaOrientacion.findByPk(preguntaId);
        if (!pregunta) continue;

        // Determinar si la pregunta predijo correctamente
        const predijoCorrectamente = pregunta.dimension_principal === perfilReal;

        await bancoPreguntasService.actualizarEfectividadPregunta(
          preguntaId,
          predijoCorrectamente
        );
      }
    } catch (error) {
      console.error('Error al actualizar efectividad de preguntas:', error);
      // No lanzar error, es opcional
    }
  }

  /**
   * Genera recomendaciones continuas (acompañamiento)
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Recomendaciones actualizadas
   */
  async generarRecomendacionesContinuas(usuarioId) {
    try {
      // Obtener último resultado
      const ultimoResultado = await ResultadoOrientacion.obtenerUltimoPorUsuario(usuarioId);

      if (!ultimoResultado) {
        throw new ApiError(404, 'No hay resultados de orientación previos');
      }

      // Obtener trayectoria actualizada
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);

      // Obtener carreras
      const carreras = await Career.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'description', 'profile', 'job_field'],
      });

      // Construir prompt de seguimiento
      const prompt = `Eres un orientador vocacional. El estudiante ya completó un test de orientación anteriormente.

Resultado anterior:
${JSON.stringify(ultimoResultado.puntuaciones_finales, null, 2)}
Código Holland: ${ultimoResultado.codigo_holland}

Trayectoria académica actualizada:
${this.formatearPerfilEstudiante(trayectoria)}

Genera recomendaciones actualizadas considerando:
1. Cambios en la trayectoria académica
2. Evolución del perfil vocacional
3. Nuevas oportunidades de desarrollo

Formato JSON:
{
  "recomendacionesActualizadas": [...],
  "cambiosDetectados": "...",
  "sugerenciasNuevas": [...]
}`;

      const respuesta = await llmService.generarRespuesta(prompt);
      const analisis = this.parsearRespuestaLLM(respuesta);

      return analisis;
    } catch (error) {
      console.error('Error en generarRecomendacionesContinuas:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al generar recomendaciones continuas: ${error.message}`);
    }
  }

  /**
   * Analiza viabilidad de cambio de carrera
   * @param {string} usuarioId - ID del usuario
   * @param {number} nuevaCarreraId - ID de la nueva carrera
   * @returns {Promise<Object>} - Análisis de viabilidad
   */
  async analizarCambioCarrera(usuarioId, nuevaCarreraId) {
    try {
      // Obtener perfil vocacional actual
      const ultimoResultado = await ResultadoOrientacion.obtenerUltimoPorUsuario(usuarioId);

      if (!ultimoResultado) {
        throw new ApiError(404, 'No hay perfil vocacional disponible');
      }

      // Obtener nueva carrera
      const nuevaCarrera = await Career.findByPk(nuevaCarreraId);

      if (!nuevaCarrera) {
        throw new ApiError(404, 'Carrera no encontrada');
      }

      // Obtener trayectoria actual
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);

      // Construir prompt de análisis
      const prompt = `Eres un orientador vocacional. Analiza la viabilidad de cambio de carrera.

Perfil vocacional actual:
${JSON.stringify(ultimoResultado.puntuaciones_finales, null, 2)}
Código Holland: ${ultimoResultado.codigo_holland}

Nueva carrera propuesta:
${nuevaCarrera.name}
${nuevaCarrera.description || ''}
${nuevaCarrera.profile || ''}

Trayectoria académica:
${this.formatearPerfilEstudiante(trayectoria)}

Analiza:
1. Compatibilidad del perfil con la nueva carrera
2. Viabilidad del cambio
3. Requisitos y desafíos
4. Recomendaciones

Formato JSON:
{
  "viabilidad": "alta|media|baja",
  "compatibilidad": 0-100,
  "razones": [...],
  "desafios": [...],
  "recomendaciones": [...]
}`;

      const respuesta = await llmService.generarRespuesta(prompt);
      const analisis = this.parsearRespuestaLLM(respuesta);

      return {
        ...analisis,
        carreraActual: trayectoria?.carrera?.name || 'No especificada',
        carreraNueva: nuevaCarrera.name,
      };
    } catch (error) {
      console.error('Error en analizarCambioCarrera:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al analizar cambio de carrera: ${error.message}`);
    }
  }

  /**
   * Obtiene perfil vocacional completo del usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Object>} - Perfil completo
   */
  async obtenerPerfilCompleto(usuarioId) {
    try {
      const ultimoResultado = await ResultadoOrientacion.obtenerUltimoPorUsuario(usuarioId);
      const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);
      const historial = await testOrientacionService.obtenerHistorial(usuarioId);

      return {
        resultadoActual: ultimoResultado,
        trayectoriaAcademica: trayectoria,
        historialTests: historial,
        perfilConsolidado: ultimoResultado
          ? ultimoResultado.obtenerPerfilConsolidado()
          : null,
      };
    } catch (error) {
      console.error('Error en obtenerPerfilCompleto:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Error al obtener perfil completo: ${error.message}`);
    }
  }
}

module.exports = new OrientacionVocacionalService();

