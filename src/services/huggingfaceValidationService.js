/**
 * Servicio de validación con Hugging Face (Router API).
 * Usa https://router.huggingface.co (la antigua api-inference.huggingface.co ya no está soportada).
 * Se usa SOLO para comparar respuestas con Gemini (mismo prompt, otro modelo).
 * No reemplaza a Gemini: la respuesta principal sigue siendo la de Gemini.
 */

const { huggingfaceToken, huggingfaceModel } = require('../config/huggingface');
const ApiError = require('../utils/ApiError');

// Nuevo endpoint (api-inference.huggingface.co devuelve 410; usar router)
const HF_ROUTER_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';

/**
 * Genera una respuesta en JSON usando la API Router de Hugging Face (formato OpenAI chat/completions)
 * con el mismo prompt que se envía a Gemini. Sirve para validar/comparar ambos modelos.
 *
 * @param {string} prompt - El mismo prompt que se envía a Gemini
 * @returns {Promise<string>} - Respuesta en texto (JSON string)
 */
async function generarRespuestaJSON(prompt) {
  if (!process.env.HUGGINGFACE_TOKEN?.trim()) {
    throw new ApiError(503, 'HUGGINGFACE_TOKEN no configurada en .env. No se puede ejecutar validación con Hugging Face.');
  }

  try {
    const res = await fetch(HF_ROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${huggingfaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: huggingfaceModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (content == null || content === '') {
      throw new Error('Hugging Face no devolvió contenido en la respuesta');
    }

    return (typeof content === 'string' ? content : String(content)).trim();
  } catch (error) {
    console.error('Error en Hugging Face (validación):', error?.message || error);
    throw new ApiError(
      500,
      `Error al generar respuesta de validación con Hugging Face: ${error?.message || 'Error desconocido'}`
    );
  }
}

module.exports = {
  generarRespuestaJSON,
};
