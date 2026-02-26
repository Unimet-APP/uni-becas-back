const asyncHandler = require('../utils/asyncHandler');
const llmService = require('../services/llmService');
const ApiResponse = require('../utils/ApiResponse');
const { Career, ResultadosOrientacion } = require('../models');
const datosInstitucionales = require('../config/datosInstitucionales.json');

/**
 * Carga las carreras activas y (si hay usuario) su último resultado de orientación.
 * Devuelve un objeto listo para pasar como contexto al llmService.
 */
/**
 * Normaliza una fila de Career (raw puede venir con name o con claves en otro formato).
 */
function normalizarCarrera(row) {
  return {
    name: String(row.name ?? row.nombre ?? '').trim(),
    faculty: String(row.faculty ?? row.facultad ?? '').trim(),
    area: String(row.area ?? '').trim(),
  };
}

async function cargarContextoInstitucional(reqUser) {
  const rows = await Career.findAll({
    where: { is_active: true },
    attributes: ['name', 'faculty', 'area'],
    order: [['name', 'ASC']],
    raw: true,
  });

  const carreras = rows.map(normalizarCarrera).filter(c => c.name.length > 0);

  let resultadoUsuario = null;
  if (reqUser?.id) {
    try {
      resultadoUsuario = await ResultadosOrientacion.findOne({
        where: { usuario_id: reqUser.id },
        order: [['fecha_generacion', 'DESC']],
        raw: true,
      });
    } catch (err) {
      console.warn('[LLMController] No se pudo cargar resultado de orientación:', err?.message);
    }
  }

  if (carreras.length === 0) {
    console.warn('[LLMController] Cargadas 0 carreras desde BD; el chatbot no listará carreras reales.');
  } else {
    console.log('[LLMController] Carreras cargadas desde BD:', carreras.length, '| Nombres:', carreras.map(c => c.name).join(', '));
  }

  return {
    carreras,
    datosInstitucionales,
    resultadoUsuario,
  };
}

class LLMController {
  /**
   * POST /api/v1/llm/consulta
   * Consulta general al LLM
   */
  consulta = asyncHandler(async (req, res) => {
    const { prompt, context } = req.body;

    const contextoInstitucional = await cargarContextoInstitucional(req.user);

    const respuesta = await llmService.generarRespuesta(prompt, {
      ...context,
      _institucional: contextoInstitucional,
    });

    res.json(new ApiResponse(200, {
      respuesta,
      timestamp: new Date().toISOString()
    }, 'Consulta procesada exitosamente'));
  });

  /**
   * POST /api/v1/llm/recomendaciones
   * Genera recomendaciones de carrera
   */
  generarRecomendaciones = asyncHandler(async (req, res) => {
    const { perfilEstudiante, carrerasDisponibles } = req.body;

    const recomendaciones = await llmService.generarRecomendacionesCarrera(
      perfilEstudiante,
      carrerasDisponibles
    );

    res.json(new ApiResponse(200, recomendaciones, 'Recomendaciones generadas'));
  });

  /**
   * POST /api/v1/llm/chat
   * Chat con historial
   */
  chat = asyncHandler(async (req, res) => {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de mensajes con al menos un mensaje'
      });
    }

    const contextoInstitucional = await cargarContextoInstitucional(req.user);

    const respuesta = await llmService.chat(mensajes, contextoInstitucional);

    res.json(new ApiResponse(200, {
      respuesta,
      timestamp: new Date().toISOString()
    }, 'Mensaje procesado'));
  });
}

module.exports = new LLMController();
