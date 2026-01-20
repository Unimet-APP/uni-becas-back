const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');

const testOrientacionService = require('../services/testOrientacionService');
const orientacionVocacionalService = require('../services/orientacionVocacionalService');
const preguntasOrientacionService = require('../services/preguntasOrientacion');
const trayectoriaAcademicaService = require('../services/trayectoriaAcademicaService');
const { SesionesTestOrientacion, ResultadosOrientacion } = require('../models');

class OrientacionVocacionalController {
  
  /**
   * POST /api/v1/orientacion/iniciar-test
   * Inicia una nueva sesión de test de orientación vocacional
   */
  iniciarTest = asyncHandler(async (req, res) => {
    const { tipoTest } = req.body;
    const usuarioId = req.user.id;

    // Crear sesión
    const sesion = await testOrientacionService.crearSesion(usuarioId, tipoTest);

    // Obtener preguntas para la ronda 1
    const preguntas = await preguntasOrientacionService.seleccionarPreguntasRonda1(
      usuarioId,
      tipoTest,
      sesion.seed_aleatorio
    );

    // Formatear preguntas para el frontend
    const preguntasFormateadas = preguntas.map(p => ({
      id: p.id,
      codigo: p.codigo_pregunta,
      texto: p.texto__pregunta,
      tipoPregunta: p.tipo_pregunta,
      peso: p.peso_pregunta,
      dimensionPrincipal: p.dimension_principal,
      dimensionSecundaria: p.dimension_secundaria || [],
      opcionesRespuesta: p.instrucciones_respuesta || [],
    }));

    return sendSuccess(res, {
      sesionId: sesion.id,
      tipoTest: sesion.tipoTest,
      estado: sesion.estado,
      preguntas: preguntasFormateadas,
      fechaInicio: sesion.fecha_inicio,
    }, 'Test iniciado exitosamente', 201);
  });

  /**
   * POST /api/v1/orientacion/guardar-respuestas-ronda-1
   * Guarda las respuestas de la ronda 1 y genera preguntas para la ronda 2
   */
  guardarRespuestasRonda1 = asyncHandler(async (req, res) => {
    const { sesionId, respuestas } = req.body;
    const usuarioId = req.user.id;

    // Guardar respuestas y calcular puntuaciones
    const resultado = await testOrientacionService.guardarRespuestasRonda1(
      sesionId,
      respuestas,
      usuarioId
    );

    // Obtener trayectoria académica para detectar discrepancias
    const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);
    const discrepancias = await testOrientacionService.detectarDiscrepancias(
      resultado.puntuaciones,
      trayectoria
    );

    // Seleccionar preguntas para la ronda 2
    const preguntasRonda2 = await preguntasOrientacionService.seleccionarPreguntasRonda2(
      sesionId,
      resultado.puntuaciones,
      discrepancias,
      resultado.ambiguedades
    );

    // Formatear preguntas para el frontend
    const preguntasFormateadas = preguntasRonda2.map(p => ({
      id: p.id,
      codigo: p.codigo_pregunta,
      texto: p.texto__pregunta,
      tipoPregunta: p.tipo_pregunta,
      peso: p.peso_pregunta,
      dimensionPrincipal: p.dimension_principal,
      dimensionSecundaria: p.dimension_secundaria || [],
      opcionesRespuesta: p.instrucciones_respuesta || [],
    }));

    return sendSuccess(res, {
      sesionId: resultado.sesion.id,
      estado: resultado.sesion.estado,
      puntuacionesRonda1: resultado.puntuaciones,
      ambiguedades: resultado.ambiguedades,
      discrepancias: discrepancias,
      preguntasRonda2: preguntasFormateadas,
    }, 'Respuestas de la ronda 1 guardadas exitosamente');
  });

  /**
   * POST /api/v1/orientacion/guardar-respuestas-ronda-2
   * Guarda las respuestas de la ronda 2 y procesa el test completo
   */
  guardarRespuestasRonda2 = asyncHandler(async (req, res) => {
    const { sesionId, respuestas } = req.body;
    const usuarioId = req.user.id;

    // Guardar respuestas y calcular puntuaciones finales
    const resultado = await testOrientacionService.guardarRespuestasRonda2(
      sesionId,
      respuestas,
      usuarioId
    );

    // Procesar test completado con LLM
    const resultadoCompleto = await orientacionVocacionalService.procesarTestCompletado(sesionId);

    return sendSuccess(res, {
      sesionId: resultado.sesion.id,
      estado: resultado.sesion.estado,
      puntuacionesFinales: resultado.puntuacionesFinales,
      resultado: {
        id: resultadoCompleto.id,
        codigoHolland: resultadoCompleto.codigo_holland,
        perfilDominante: resultadoCompleto.perfil_dominante,
        perfilSecundario: resultadoCompleto.perfil_secundario,
        nivelConfianza: resultadoCompleto.nivel_confianza_general,
        recomendacionesCarreras: resultadoCompleto.recomendaciones_carreras,
        perfilVocacional: resultadoCompleto.perfil_vocacional,
        areasDesarrollo: resultadoCompleto.areas_desarrollo,
        sugerenciasAcompanamiento: resultadoCompleto.sugerencias_acompanamiento,
        planDesarrollo: resultadoCompleto.plan_desarrollo,
      },
    }, 'Test completado exitosamente');
  });

  /**
   * GET /api/v1/orientacion/sesion/:sesionId
   * Obtiene la información de una sesión de test
   */
  obtenerSesion = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const usuarioId = req.user.id;

    const sesion = await SesionesTestOrientacion.findByPk(sesionId);

    if (!sesion) {
      throw new ApiError(404, 'Sesión no encontrada');
    }

    // Verificar que la sesión pertenece al usuario
    if (sesion.usuarioId !== usuarioId) {
      throw new ApiError(403, 'No tienes permisos para acceder a esta sesión');
    }

    return sendSuccess(res, {
      id: sesion.id,
      tipoTest: sesion.tipoTest,
      estado: sesion.estado,
      fechaInicio: sesion.fecha_inicio,
      fechaRonda1: sesion.fecha_ronda_1,
      fechaRonda2: sesion.fecha_ronda_2,
      fechaCompletada: sesion.fecha_completada,
      puntuacionesRonda1: sesion.puntuaciones_ronda_1,
      puntuacionesRonda2: sesion.puntuaciones_ronda_2,
      nivelConfianzaRonda1: sesion.nivel_confianza_ronda_1,
      nivelConfianzaRonda2: sesion.nivel_confianza_ronda_2,
      areasAmbiguedad: sesion.areas_ambiguedad,
      discrepancias: sesion.discrepancias,
    }, 'Sesión obtenida exitosamente');
  });

  /**
   * GET /api/v1/orientacion/resultados/:sesionId
   * Obtiene los resultados completos de una sesión de test
   */
  obtenerResultados = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const usuarioId = req.user.id;

    const sesion = await SesionesTestOrientacion.findByPk(sesionId);

    if (!sesion) {
      throw new ApiError(404, 'Sesión no encontrada');
    }

    // Verificar que la sesión pertenece al usuario
    if (sesion.usuarioId !== usuarioId) {
      throw new ApiError(403, 'No tienes permisos para acceder a esta sesión');
    }

    const resultado = await ResultadosOrientacion.findOne({
      where: { sesion_id: sesionId }
    });

    if (!resultado) {
      throw new ApiError(404, 'Resultados no encontrados para esta sesión');
    }

    return sendSuccess(res, {
      id: resultado.id,
      sesionId: resultado.sesion_id,
      tipoTest: resultado.tipo_test,
      puntuacionesFinales: resultado.puntuaciones_finales,
      codigoHolland: resultado.codigo_holland,
      perfilDominante: resultado.perfil_dominante,
      perfilSecundario: resultado.perfil_secundario,
      nivelConfianzaGeneral: resultado.nivel_confianza_general,
      analisisLLM: resultado.analisis_llm,
      recomendacionesCarreras: resultado.recomendaciones_carreras,
      perfilVocacional: resultado.perfil_vocacional,
      trayectoriaAcademicaAnalizada: resultado.trayectoria_academica_analizada,
      areasDesarrollo: resultado.areas_desarrollo,
      sugerenciasAcompanamiento: resultado.sugerencias_acompanamiento,
      planDesarrollo: resultado.plan_desarrollo,
      fechaGeneracion: resultado.fecha_generacion,
    }, 'Resultados obtenidos exitosamente');
  });

  /**
   * GET /api/v1/orientacion/mi-perfil-vocacional
   * Obtiene el perfil vocacional completo del usuario autenticado
   */
  obtenerPerfilVocacional = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const perfil = await orientacionVocacionalService.obtenerPerfilCompleto(usuarioId);

    return sendSuccess(res, perfil, 'Perfil vocacional obtenido exitosamente');
  });

  /**
   * GET /api/v1/orientacion/historial
   * Obtiene el historial de tests del usuario autenticado
   */
  obtenerHistorial = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const historial = await testOrientacionService.obtenerHistorial(usuarioId);

    const historialFormateado = historial.map(sesion => ({
      id: sesion.id,
      tipoTest: sesion.tipoTest,
      estado: sesion.estado,
      fechaInicio: sesion.fecha_inicio,
      fechaCompletada: sesion.fecha_completada,
      puntuacionesRonda1: sesion.puntuaciones_ronda_1,
      puntuacionesRonda2: sesion.puntuaciones_ronda_2,
    }));

    return sendSuccess(res, {
      historial: historialFormateado,
      total: historialFormateado.length,
    }, 'Historial obtenido exitosamente');
  });

  /**
   * POST /api/v1/orientacion/recomendaciones-continuas
   * Genera recomendaciones continuas basadas en el perfil del usuario
   */
  generarRecomendacionesContinuas = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const recomendaciones = await orientacionVocacionalService.generarRecomendacionesContinuas(usuarioId);

    return sendSuccess(res, recomendaciones, 'Recomendaciones generadas exitosamente');
  });

  /**
   * POST /api/v1/orientacion/analizar-cambio-carrera
   * Analiza la viabilidad de un cambio de carrera
   */
  analizarCambioCarrera = asyncHandler(async (req, res) => {
    const { nuevaCarreraId } = req.body;
    const usuarioId = req.user.id;

    const analisis = await orientacionVocacionalService.analizarCambioCarrera(
      usuarioId,
      nuevaCarreraId
    );

    return sendSuccess(res, analisis, 'Análisis de cambio de carrera generado exitosamente');
  });
}

module.exports = new OrientacionVocacionalController();
