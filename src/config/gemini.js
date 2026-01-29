require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Verificar que la API key existe
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY no está configurada en .env');
}

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ✅ Nombre del modelo como string
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Configuración de generación
const generationConfig = {
  temperature: 0.3,  // Reducido para respuestas más deterministas y completas
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,  // Aumentado para evitar truncamiento de JSON
  //responseMimeType: 'application/json',  // Forzar formato JSON
};

const genConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
}

// Configuración de seguridad
const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

module.exports = {
  genAI,
  modelName,
  generationConfig,
  safetySettings,
};