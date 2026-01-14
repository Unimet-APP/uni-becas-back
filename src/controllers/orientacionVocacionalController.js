const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const testOrientacionService = require('../services/testOrientacionService');
const orientacionVocacionalService = require('../services/orientacionVocacionalService');

class OrientacionVocacionalController {
  /**
   * POST /api/v1/orientacion/iniciar-test
   * Inicia un nuevo test de orientación vocacional
   */
  iniciarTest = asyncHandler(async (req, res) => {
    const { tipoTest } = req.body;
    const usuarioId = req.user.id;

    const resultado = await testOrientacionService.crearSesion(usuarioId, tipoTest);

    res.json(
      new ApiResponse(200, {
        sesionId: resultado.sesion.id,
        tipoTest: resultado.sesion.tipo_test,
        estado: resultado.sesion.estado,
        preguntas: resultado.preguntas || [],
        fechaInicio: resultado.sesion.fecha_inicio,
        totalPreguntas: resultado.preguntas?.length || 0,
      }, 'Test iniciado correctamente')
    );
  });

  /**
   * POST /api/v1/orientacion/guardar-respuestas-ronda-1
   * Guarda respuestas de Ronda 1 y obtiene preguntas de Ronda 2
   */
  guardarRespuestasRonda1 = asyncHandler(async (req, res) => {
    const { sesionId, respuestas } = req.body;
    const usuarioId = req.user.id;

    const resultado = await testOrientacionService.guardarRespuestasRonda1(
      sesionId,
      respuestas,
      usuarioId
    );

    res.json(
      new ApiResponse(200, {
        puntuaciones: resultado.puntuaciones,
        areasAmbiguas: resultado.areasAmbiguas,
        discrepancias: resultado.discrepancias,
        preguntasRonda2: resultado.preguntasRonda2,
        estado: 'ronda_1_completada',
      }, 'Respuestas de Ronda 1 guardadas correctamente')
    );
  });

  /**
   * POST /api/v1/orientacion/guardar-respuestas-ronda-2
   * Guarda respuestas de Ronda 2 y procesa el test completo
   */
  guardarRespuestasRonda2 = asyncHandler(async (req, res) => {
    const { sesionId, respuestas } = req.body;
    const usuarioId = req.user.id;

    // 1. Guardar respuestas y calcular puntuaciones finales
    const resultadoPuntuaciones = await testOrientacionService.guardarRespuestasRonda2(
      sesionId,
      respuestas,
      usuarioId
    );

    // 2. Procesar test completo con LLM
    const resultadoCompleto = await orientacionVocacionalService.procesarTestCompletado(sesionId);

    res.json(
      new ApiResponse(200, {
        puntuacionesRonda2: resultadoPuntuaciones.puntuacionesRonda2,
        puntuacionesFinales: resultadoPuntuaciones.puntuacionesFinales,
        resultado: {
          id: resultadoCompleto.id,
          codigoHolland: resultadoCompleto.codigo_holland,
          perfilDominante: resultadoCompleto.perfil_dominante,
          perfilSecundario: resultadoCompleto.perfil_secundario,
          nivelConfianza: resultadoCompleto.nivel_confianza_general,
          recomendacionesCarreras: resultadoCompleto.obtenerCarrerasRecomendadas(10),
          perfilVocacional: resultadoCompleto.obtenerPerfilConsolidado(),
        },
        estado: 'finalizada',
      }, 'Test completado y analizado exitosamente')
    );
  });

  /**
   * GET /api/v1/orientacion/sesion/:sesionId
   * Obtiene información de una sesión específica
   */
  obtenerSesion = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const usuarioId = req.user.id;

    const { SesionTestOrientacion } = require('../models');
    const sesion = await SesionTestOrientacion.findByPk(sesionId, {
      include: [
        {
          model: require('../models').RespuestaTestOrientacion,
          as: 'respuestas',
        },
      ],
    });

    if (!sesion) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada',
      });
    }

    if (sesion.usuario_id !== usuarioId) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para acceder a esta sesión',
      });
    }

    res.json(
      new ApiResponse(200, {
        sesion: {
          id: sesion.id,
          tipoTest: sesion.tipo_test,
          estado: sesion.estado,
          fechaInicio: sesion.fecha_inicio,
          fechaRonda1: sesion.fecha_ronda_1,
          fechaRonda2: sesion.fecha_ronda_2,
          fechaFinalizacion: sesion.fecha_finalizacion,
          puntuacionesRonda1: sesion.puntuaciones_ronda_1,
          puntuacionesRonda2: sesion.puntuaciones_ronda_2,
          areasAmbiguas: sesion.areas_ambiguedad,
          discrepancias: sesion.discrepancias_detectadas,
        },
      }, 'Sesión obtenida correctamente')
    );
  });

  /**
   * GET /api/v1/orientacion/resultados/:sesionId
   * Obtiene resultados completos de una sesión
   */
  obtenerResultados = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const usuarioId = req.user.id;

    const { ResultadoOrientacion } = require('../models');
    const resultado = await ResultadoOrientacion.findOne({
      where: {
        sesion_id: sesionId,
        usuario_id: usuarioId,
      },
      include: [
        {
          model: require('../models').SesionTestOrientacion,
          as: 'sesion',
        },
      ],
    });

    if (!resultado) {
      return res.status(404).json({
        success: false,
        message: 'Resultado no encontrado',
      });
    }

    res.json(
      new ApiResponse(200, {
        resultado: {
          id: resultado.id,
          tipoTest: resultado.tipo_test,
          puntuacionesFinales: resultado.puntuaciones_finales,
          codigoHolland: resultado.codigo_holland,
          perfilDominante: resultado.perfil_dominante,
          perfilSecundario: resultado.perfil_secundario,
          nivelConfianza: resultado.nivel_confianza_general,
          recomendacionesCarreras: resultado.obtenerCarrerasRecomendadas(),
          perfilVocacional: resultado.obtenerPerfilConsolidado(),
          analisisLLM: resultado.analisis_llm,
          areasDesarrollo: resultado.areas_desarrollo,
          sugerenciasAcompanamiento: resultado.sugerencias_acompanamiento,
          planDesarrollo: resultado.plan_desarrollo,
          fechaGeneracion: resultado.fecha_generacion,
        },
      }, 'Resultados obtenidos correctamente')
    );
  });

  /**
   * GET /api/v1/orientacion/mi-perfil-vocacional
   * Obtiene el perfil vocacional completo del usuario autenticado
   */
  obtenerPerfilVocacional = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const perfil = await orientacionVocacionalService.obtenerPerfilCompleto(usuarioId);

    res.json(
      new ApiResponse(200, perfil, 'Perfil vocacional obtenido correctamente')
    );
  });

  /**
   * GET /api/v1/orientacion/historial
   * Obtiene el historial de tests del usuario
   */
  obtenerHistorial = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const historial = await testOrientacionService.obtenerHistorial(usuarioId);

    res.json(
      new ApiResponse(200, {
        historial: historial.map((sesion) => ({
          id: sesion.id,
          tipoTest: sesion.tipo_test,
          estado: sesion.estado,
          fechaInicio: sesion.fecha_inicio,
          fechaFinalizacion: sesion.fecha_finalizacion,
          puntuacionesRonda1: sesion.puntuaciones_ronda_1,
          puntuacionesRonda2: sesion.puntuaciones_ronda_2,
          resultado: sesion.resultado
            ? {
                id: sesion.resultado.id,
                codigoHolland: sesion.resultado.codigo_holland,
                perfilDominante: sesion.resultado.perfil_dominante,
                fechaGeneracion: sesion.resultado.fecha_generacion,
              }
            : null,
        })),
        total: historial.length,
      }, 'Historial obtenido correctamente')
    );
  });

  /**
   * POST /api/v1/orientacion/recomendaciones-continuas
   * Genera recomendaciones actualizadas (acompañamiento continuo)
   */
  generarRecomendacionesContinuas = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const recomendaciones = await orientacionVocacionalService.generarRecomendacionesContinuas(
      usuarioId
    );

    res.json(
      new ApiResponse(200, recomendaciones, 'Recomendaciones continuas generadas correctamente')
    );
  });

  /**
   * POST /api/v1/orientacion/analizar-cambio-carrera
   * Analiza la viabilidad de cambiar de carrera
   */
  analizarCambioCarrera = asyncHandler(async (req, res) => {
    const { nuevaCarreraId } = req.body;
    const usuarioId = req.user.id;

    const analisis = await orientacionVocacionalService.analizarCambioCarrera(
      usuarioId,
      nuevaCarreraId
    );

    res.json(
      new ApiResponse(200, analisis, 'Análisis de cambio de carrera generado correctamente')
    );
  });
}

module.exports = new OrientacionVocacionalController();

