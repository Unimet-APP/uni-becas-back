require('dotenv').config();

const OpenAI = require('openai');

// La API de xAI (Grok) es compatible con el cliente OpenAI; solo cambia la URL base.
if (!process.env.GROK_API_KEY) {
  console.warn('⚠️  GROK_API_KEY no está configurada en .env. La validación con Grok no estará disponible.');
}

const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY || '',
  baseURL: 'https://api.x.ai/v1',
});

// Modelo: el id que usa xAI (ej. grok-2, grok-4-fast-non-reasoning, o el id de Llama 3.3 70B si lo ofrecen).
const grokModel = process.env.GROK_MODEL || 'grok-2';

module.exports = {
  grokClient,
  grokModel,
};
