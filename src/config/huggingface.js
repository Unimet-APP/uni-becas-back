require('dotenv').config();

if (!process.env.HUGGINGFACE_TOKEN) {
  console.warn('⚠️  HUGGINGFACE_TOKEN no está configurada en .env. La validación con Hugging Face no estará disponible.');
}

// Token para la API de inferencia de Hugging Face (https://huggingface.co/settings/tokens)
const huggingfaceToken = process.env.HUGGINGFACE_TOKEN || '';

// Modelo de Hugging Face (id en la Hub, ej. meta-llama/Llama-3.1-8B-Instruct)
const huggingfaceModel = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';

module.exports = {
  huggingfaceToken,
  huggingfaceModel,
};
