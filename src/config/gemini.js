require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Verificar que la API key existe
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY no está configurada en .env');
}

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ✅ CORREGIDO: Nombre del modelo como string (cambiar el default a gemini-pro)
const GEMINIMODEL = process.env.GEMINI_MODEL || 'gemini-pro';

// Configuración de generación
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
};

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
  GEMINIMODEL,  // ✅ String con el nombre del modelo
  generationConfig,
  safetySettings,
};