/**
 * Servicio de validación con Grok (xAI).
 * Se usa SOLO para comparar respuestas con Gemini (mismo prompt, otro modelo).
 * No reemplaza a Gemini: la respuesta principal sigue siendo la de Gemini.
 */

const { grokClient, grokModel } = require('../config/grok');
const ApiError = require('../utils/ApiError');

/**
 * Genera una respuesta en JSON usando la API de Grok (xAI) con el mismo prompt
 * que se envía a Gemini. Sirve para validar/comparar ambos modelos.
 *
 * @param {string} prompt - El mismo prompt que se envía a Gemini
 * @returns {Promise<string>} - Respuesta en texto (JSON string)
 */
async function generarRespuestaJSON(prompt) {
  if (!process.env.GROK_API_KEY) {
    throw new ApiError(503, 'GROK_API_KEY no configurada. No se puede ejecutar validación con Grok.');
  }

  try {
    const completion = await grokClient.chat.completions.create({
      model: grokModel,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Grok no devolvió contenido en la respuesta');
    }

    return content;
  } catch (error) {
    console.error('Error en Grok (validación):', error?.message || error);
    throw new ApiError(
      500,
      `Error al generar respuesta de validación con Grok: ${error?.message || 'Error desconocido'}`
    );
  }
}

module.exports = {
  generarRespuestaJSON,
};
