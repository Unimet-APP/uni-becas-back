const asyncHandler = require('../utils/asyncHandler');
const llmService = require('../services/llmService');
// ✅ CORREGIDO: Import con mayúscula (aunque en Windows funciona con minúscula, es mejor ser consistente)
const ApiResponse = require('../utils/ApiResponse');

class LLMController {
  /**
   * POST /api/v1/llm/consulta
   * Consulta general al LLM
   */
  consulta = asyncHandler(async (req, res) => {
    const { prompt, context } = req.body;
    
    const respuesta = await llmService.generarRespuesta(prompt, context);
    
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
    const { mensajes, contexto } = req.body;
    
    // Validación adicional
    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de mensajes con al menos un mensaje'
      });
    }

    const respuesta = await llmService.chat(mensajes, contexto);
    
    res.json(new ApiResponse(200, {
      respuesta,
      timestamp: new Date().toISOString()
    }, 'Mensaje procesado'));
  });
}

module.exports = new LLMController();