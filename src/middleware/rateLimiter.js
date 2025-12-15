const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const config = require('../config/config');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Password reset limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration limiter
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registration requests per hour
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter por usuario autenticado (en vez de solo IP)
// Usa el userId si está disponible, caso contrario usa IP
const userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each user to 200 requests per windowMs (más generoso que por IP)
  message: {
    success: false,
    message: 'Demasiadas solicitudes de tu cuenta. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar userId del usuario autenticado como key
  keyGenerator: (req) => {
    // Si hay usuario autenticado, usar su ID
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    // Si no hay usuario, usar IP con helper de IPv6 (fallback)
    return ipKeyGenerator(req);
  },
  // Saltar rate limit para admins
  skip: (req) => {
    return req.user && req.user.puedeAdministrar && req.user.puedeAdministrar();
  }
});

// Rate limiter específico para endpoints de reportes (proteger contra spam)
const reportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 reportes por minuto por usuario
  message: {
    success: false,
    message: 'Estás creando reportes muy rápido. Espera un momento e intenta de nuevo.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `report:${req.user.id}`;
    }
    return ipKeyGenerator(req);
  }
});

// Rate limiter para postulaciones (prevenir spam de postulaciones)
const postulacionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 postulaciones por hora
  message: {
    success: false,
    message: 'Demasiadas postulaciones en poco tiempo. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `postulacion:${req.user.id}`;
    }
    return ipKeyGenerator(req);
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
  uploadLimiter,
  userBasedLimiter,
  reportLimiter,
  postulacionLimiter
};