const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../config/responses');
const ApiError = require('../utils/ApiError');

const testOrientacionService = require('../services/testOrientacionService');
const orientacionVocacionalService = require('../services/orientacionVocacionalService');
const icoOrientacionService = require('../services/icoOrientacionService');
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
      tipoTest: sesion.tipo_test,
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
    if (sesion.usuario_id !== usuarioId) {
      throw new ApiError(403, 'No tienes permisos para acceder a esta sesión');
    }

    return sendSuccess(res, {
      id: sesion.id,
      tipoTest: sesion.tipo_test,
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
    if (sesion.usuario_id !== usuarioId) {
      throw new ApiError(403, 'No tienes permisos para acceder a esta sesión');
    }

    const resultado = await ResultadosOrientacion.findOne({
      where: { sesion_id: sesionId }
    });

    // Si no hay resultado pero la sesión está en ronda_2_completada, intentar procesarlo
    if (!resultado && sesion.estado === 'ronda_2_completada') {
      try {
        // Intentar procesar el test si aún no se ha procesado
        const resultadoNuevo = await orientacionVocacionalService.procesarTestCompletado(sesionId);
        return sendSuccess(res, {
          id: resultadoNuevo.id,
          sesionId: resultadoNuevo.sesion_id,
          tipoTest: resultadoNuevo.tipo_test,
          puntuacionesFinales: resultadoNuevo.puntuaciones_finales,
          codigoHolland: resultadoNuevo.codigo_holland,
          perfilDominante: resultadoNuevo.perfil_dominante,
          perfilSecundario: resultadoNuevo.perfil_secundario,
          nivelConfianzaGeneral: resultadoNuevo.nivel_confianza_general,
          analisisLLM: resultadoNuevo.analisis_llm,
          recomendacionesCarreras: resultadoNuevo.recomendaciones_carreras,
          perfilVocacional: resultadoNuevo.perfil_vocacional,
          trayectoriaAcademicaAnalizada: resultadoNuevo.trayectoria_academica_analizada,
          areasDesarrollo: resultadoNuevo.areas_desarrollo,
          sugerenciasAcompanamiento: resultadoNuevo.sugerencias_acompanamiento,
          planDesarrollo: resultadoNuevo.plan_desarrollo,
          fechaGeneracion: resultadoNuevo.fecha_generacion,
        }, 'Resultados obtenidos exitosamente');
      } catch (error) {
        // Si falla el procesamiento, retornar información parcial de la sesión
        return sendSuccess(res, {
          sesionId: sesion.id,
          estado: sesion.estado,
          tipoTest: sesion.tipo_test,
          puntuacionesRonda1: sesion.puntuaciones_ronda_1 || {},
          puntuacionesRonda2: sesion.puntuaciones_ronda_2 || {},
          mensaje: 'Los resultados están siendo procesados. Intenta nuevamente en unos momentos.',
          procesando: true,
        }, 'Resultados en proceso');
      }
    }

    // Si no hay resultado y la sesión no está completada
    if (!resultado) {
      return sendSuccess(res, {
        sesionId: sesion.id,
        estado: sesion.estado,
        tipoTest: sesion.tipo_test,
        puntuacionesRonda1: sesion.puntuaciones_ronda_1 || {},
        puntuacionesRonda2: sesion.puntuaciones_ronda_2 || {},
        mensaje: 'El test aún no ha sido completado. Los resultados estarán disponibles una vez que completes la ronda 2.',
        completado: false,
      }, 'Test en progreso');
    }

    // Si hay resultado, retornarlo completo
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
   * GET /api/v1/orientacion/trayectoria-academica
   * Obtiene la trayectoria académica actual del usuario (para el formulario de bachillerato).
   */
  obtenerTrayectoriaAcademica = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const trayectoria = await trayectoriaAcademicaService.obtenerTrayectoriaActual(usuarioId);
    const data = {
      id: trayectoria.id,
      promediosPorAno: trayectoria.promedios_por_ano || {},
      promedioGeneral: trayectoria.promedio_general_acumulado != null ? Number(trayectoria.promedio_general_acumulado) : null,
      gradoActual: trayectoria.grado_actual || null,
      materiasDestacadas: trayectoria.materias_destacadas || [],
      actividadesExtracurriculares: trayectoria.actividades_extracurriculares || [],
      proyectosRealizados: trayectoria.proyectos_realizados || [],
      materiasPorAnoLapso: trayectoria.materias_por_ano_lapso || {},
      materiasPorArea: trayectoria.materias_por_area || [],
    };
    return sendSuccess(res, data, 'Trayectoria académica obtenida');
  });

  /**
   * PUT /api/v1/orientacion/trayectoria-academica
   * Actualiza la trayectoria académica del usuario (formulario de bachillerato).
   */
  actualizarTrayectoriaAcademica = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const datos = req.body;
    const trayectoria = await trayectoriaAcademicaService.actualizarTrayectoria(usuarioId, datos);
    const data = {
      id: trayectoria.id,
      promediosPorAno: trayectoria.promedios_por_ano || {},
      promedioGeneral: trayectoria.promedio_general_acumulado != null ? Number(trayectoria.promedio_general_acumulado) : null,
      gradoActual: trayectoria.grado_actual || null,
      materiasDestacadas: trayectoria.materias_destacadas || [],
      actividadesExtracurriculares: trayectoria.actividades_extracurriculares || [],
      proyectosRealizados: trayectoria.proyectos_realizados || [],
      materiasPorAnoLapso: trayectoria.materias_por_ano_lapso || {},
      materiasPorArea: trayectoria.materias_por_area || [],
    };
    return sendSuccess(res, data, 'Trayectoria académica actualizada');
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
    console.log('📥 [obtenerHistorial Controller] Usuario ID:', usuarioId);

    const historial = await testOrientacionService.obtenerHistorial(usuarioId);
    console.log('📦 [obtenerHistorial Controller] Historial recibido:', historial ? historial.length : 'null/undefined');

    // Validar que historial sea un array
    if (!Array.isArray(historial)) {
      console.error('❌ [obtenerHistorial Controller] Historial no es un array:', typeof historial);
      return sendSuccess(res, {
        historial: [],
        total: 0,
      }, 'Historial obtenido exitosamente (vacío)');
    }

    const historialFormateado = historial.map(sesion => {
      // resultado es un array porque es hasMany, tomar el primero si existe
      const resultado = Array.isArray(sesion.resultado) 
        ? sesion.resultado[0] 
        : sesion.resultado;
      
      return {
        id: sesion.id,
        tipoTest: sesion.tipo_test, // CORRECCIÓN: usar snake_case
        estado: sesion.estado || 'iniciada', // Si no tiene estado, asumir 'iniciada'
        fechaInicio: sesion.fecha_inicio,
        fechaCompletada: sesion.fecha_completada,
        puntuacionesRonda1: sesion.puntuaciones_ronda_1,
        puntuacionesRonda2: sesion.puntuaciones_ronda_2,
        tieneResultado: !!resultado, // Indicar si tiene resultado procesado
      };
    });

    console.log('✅ [obtenerHistorial Controller] Historial formateado:', historialFormateado.length, 'elementos');

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

  // --- Test ICO (una sola ronda, todas las preguntas, resultado + LLM) ---

  /**
   * POST /api/v1/orientacion/iniciar-test-ico
   * Inicia una sesión del test ICO.
   */
  iniciarTestIco = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const sesion = await icoOrientacionService.iniciarTestIco(usuarioId);
    return sendSuccess(res, {
      sesionId: sesion.id,
      tipoTest: 'ICO',
      estado: sesion.estado,
      fechaInicio: sesion.fecha_inicio,
    }, 'Sesión ICO iniciada', 201);
  });

  /**
   * GET /api/v1/orientacion/sesion-ico/:sesionId/preguntas
   * Devuelve todas las preguntas del test ICO para la sesión.
   */
  obtenerPreguntasIco = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const preguntas = await icoOrientacionService.obtenerPreguntasIco(sesionId);
    const formateadas = preguntas.map(p => ({
      id: p.id,
      codigo: p.codigo_pregunta,
      texto: p.texto__pregunta,
      tipoPregunta: p.tipo_pregunta,
      peso: p.peso_pregunta,
      dimensionPrincipal: p.dimension_principal,
      opcionesRespuesta: p.instrucciones_respuesta || [],
    }));
    return sendSuccess(res, { preguntas: formateadas }, 'Preguntas ICO obtenidas');
  });

  /**
   * POST /api/v1/orientacion/guardar-respuestas-ico
   * Guarda todas las respuestas ICO, calcula puntuaciones, llama al LLM y devuelve el resultado.
   */
  guardarRespuestasIcoYFinalizar = asyncHandler(async (req, res) => {
    const { sesionId, respuestas } = req.body;
    const payload = await icoOrientacionService.guardarRespuestasIcoYFinalizar(sesionId, respuestas);
    const response = {
      resultadoId: payload.resultado.id,
      puntuaciones: payload.puntuaciones,
      codigoHolland: payload.codigoHolland,
      perfilDominante: payload.perfil_dominante,
      perfilSecundario: payload.perfil_secundario,
      analisisLlm: payload.analisis_llm,
      recomendacionesCarreras: payload.recomendacionesCarreras || payload.analisis_llm?.carrerasRecomendadas || [],
    };
    // Validación Hugging Face (cuando USE_HUGGINGFACE_VALIDATION=true)
    if (payload.validacion_huggingface != null) {
      response.validacionHuggingface = payload.validacion_huggingface;
    }
    if (payload.validacion_huggingface_error != null) {
      response.validacionHuggingfaceError = payload.validacion_huggingface_error;
    }
    // Validación Grok (cuando USE_GROK_VALIDATION=true; para probar más adelante)
    if (payload.validacion_grok != null) {
      response.validacionGrok = payload.validacion_grok;
    }
    if (payload.validacion_grok_error != null) {
      response.validacionGrokError = payload.validacion_grok_error;
    }
    return sendSuccess(res, response, 'Test ICO finalizado y resultado generado');
  });

  /**
   * GET /api/v1/orientacion/resultados-ico/:sesionId
   * Obtiene el resultado de una sesión ICO finalizada.
   */
  obtenerResultadoIco = asyncHandler(async (req, res) => {
    const { sesionId } = req.params;
    const resultado = await icoOrientacionService.obtenerResultadoIco(sesionId);
    return sendSuccess(res, resultado, 'Resultado ICO obtenido');
  });

  /**
   * GET /api/v1/orientacion/historial-especialista
   * Obtiene el historial de tests de los usuario para el especialista 
   */
  obtenerHistorialEspecialista = asyncHandler(async (req, res) => {
    const historial = await testOrientacionService.obtenerTodosLosTests();
  
    // ⚠️ PASO 1: Agrupar por usuario_id
    const agrupadoPorUsuario = {};
    
    historial.forEach(sesion => {
      const usuarioId = sesion.usuario_id;
      
      // Si es la primera vez que vemos este usuario, inicializar
      if (!agrupadoPorUsuario[usuarioId]) {
        agrupadoPorUsuario[usuarioId] = {
          estudiante: {
            id: sesion.usuario.id,
            nombre: sesion.usuario.nombre,
            email: sesion.usuario.email,
          },
          sesiones: [],
          perfilDominante: null,
          codigoHolland: null,
          recomendacionesCarreras: null,  // ⚠️ AGREGAR ESTE CAMPO
          ultimaFechaTest: null,
        };
      }
      
      // Agregar sesión al array de sesiones del usuario
      agrupadoPorUsuario[usuarioId].sesiones.push({
        id: sesion.id,
        tipoTest: sesion.tipo_test,
        estado: sesion.estado,
        fechaInicio: sesion.fecha_inicio,
        fechaCompletada: sesion.fecha_completada,
      });
      
      // ⚠️ PASO 2: Obtener el resultado más reciente para el perfil
      // Manejar que resultado puede ser array (hasMany) o objeto (hasOne)
      const resultado = Array.isArray(sesion.resultado) 
      ? sesion.resultado[0]  // Si es array, tomar el primero
      : sesion.resultado;     // Si es objeto, usarlo directamente

      // ⚠️ CAMBIO: Verificar si tiene resultado (no solo perfil_dominante)
      if (resultado) {
      const fechaResultado = resultado.fecha_generacion || sesion.fecha_completada;
      const fechaActual = agrupadoPorUsuario[usuarioId].ultimaFechaTest;

      // Si no tenemos perfil o este es más reciente, actualizar
      if (!fechaActual || (fechaResultado && fechaResultado > fechaActual)) {
        // Actualizar perfil solo si existe
        if (resultado.perfil_dominante) {
          agrupadoPorUsuario[usuarioId].perfilDominante = resultado.perfil_dominante;
        }
        if (resultado.codigo_holland) {
          agrupadoPorUsuario[usuarioId].codigoHolland = resultado.codigo_holland;
        }
        
        // ⚠️ IMPORTANTE: Manejar JSONB correctamente
        // JSONB puede venir como objeto parseado o como string
        let recomendaciones = resultado.recomendaciones_carreras;
        
        // Si es string, parsearlo
        if (typeof recomendaciones === 'string') {
          try {
            recomendaciones = JSON.parse(recomendaciones);
          } catch (e) {
            recomendaciones = null;
          }
        }
        
        // Si es array válido, asignarlo
        if (Array.isArray(recomendaciones) && recomendaciones.length > 0) {
          agrupadoPorUsuario[usuarioId].recomendacionesCarreras = recomendaciones;
        } else if (recomendaciones && !Array.isArray(recomendaciones)) {
          // Si es un objeto único, convertirlo a array
          agrupadoPorUsuario[usuarioId].recomendacionesCarreras = [recomendaciones];
        }
        
        agrupadoPorUsuario[usuarioId].ultimaFechaTest = fechaResultado;
      }
      }
    });
    
    // ⚠️ PASO 3: Convertir el objeto agrupado a array y formatear
    const historialFormateado = Object.values(agrupadoPorUsuario).map(usuario => ({
      estudiante: usuario.estudiante,
      perfilDominante: usuario.perfilDominante || 'No disponible',
      codigoHolland: usuario.codigoHolland || 'N/A',
      recomendacionesCarreras: usuario.recomendacionesCarreras || [],  // ⚠️ CORREGIR: quitar la 's' extra
      totalSesiones: usuario.sesiones.length,
      ultimaFechaTest: usuario.ultimaFechaTest,
    }));
    
    return sendSuccess(res, historialFormateado, 'Historial obtenido exitosamente');
  });
}

module.exports = new OrientacionVocacionalController();
