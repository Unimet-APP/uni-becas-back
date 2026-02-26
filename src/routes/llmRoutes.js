const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const llmController = require('../controllers/llmController');
const { validateChat, validateConsulta, validateRecomendaciones} = require('../validators/llmValidators');
const { optionalAuth } = require('../middleware/auth');

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

// Rutas públicas con rate limiting + optionalAuth (detecta usuario si envía JWT)
router.post('/chat', chatRateLimit, optionalAuth, validateChat, llmController.chat);
router.post('/consulta', chatRateLimit, optionalAuth, validateConsulta, llmController.consulta);
router.post('/recomendaciones', chatRateLimit, optionalAuth, validateRecomendaciones, llmController.generarRecomendaciones);

module.exports = router;