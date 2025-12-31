const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const llmController = require('../controllers/llmController');
const { validateChat } = require('../validators/llmValidators');

// Rate limiting para prevenir abuso (sin autenticación)
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 mensajes por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados mensajes. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ❌ SIN authenticate, SIN requireAccesoOrientacionVocacional
// Ruta pública con rate limiting
router.post('/chat', chatRateLimit, validateChat, llmController.chat);

module.exports = router;