const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { Usuario } = require('../models');
const ApiError = require('../utils/ApiError');
const { sendError } = require('../config/responses');
const { MENSAJES_ERROR } = require('../config/constants');

const authenticate = async (req, res, next) => {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    // Verificar y decodificar token
    const decoded = verifyAccessToken(token);

    // Buscar usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      throw ApiError.unauthorized(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      throw ApiError.forbidden(MENSAJES_ERROR.USUARIO_INACTIVO);
    }

    // Verificar que el email esté verificado (opcional según el endpoint)
    if (!usuario.emailVerified && req.requireEmailVerification !== false) {
      throw ApiError.forbidden(MENSAJES_ERROR.EMAIL_NO_VERIFICADO);
    }

    // Agregar usuario y token info al request
    req.user = usuario;
    req.token = {
      payload: decoded,
      raw: token
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, error.message, error.statusCode);
    }
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }
};

// Middleware opcional - no requiere autenticación pero la detecta si está presente
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      req.token = null;
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyAccessToken(token);

    const usuario = await Usuario.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (usuario && usuario.activo) {
      req.user = usuario;
      req.token = {
        payload: decoded,
        raw: token
      };
    } else {
      req.user = null;
      req.token = null;
    }

    next();
  } catch (error) {
    // En auth opcional, ignoramos errores de token y continuamos
    req.user = null;
    req.token = null;
    next();
  }
};

// Middleware para verificar que el email esté verificado
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  if (!req.user.emailVerified) {
    return sendError(res, MENSAJES_ERROR.EMAIL_NO_VERIFICADO, 403);
  }

  next();
};

// Middleware para verificar ownership de un recurso
const requireOwnership = (resourceUserIdField = 'usuarioId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
      }

      // Si es admin, permitir acceso
      if (req.user.esAdmin()) {
        return next();
      }

      // Verificar ownership basado en el campo especificado
      const resourceUserId = req.body[resourceUserIdField] ||
                           req.params[resourceUserIdField] ||
                           req.query[resourceUserIdField];

      if (resourceUserId && resourceUserId !== req.user.id) {
        return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
      }

      next();
    } catch (error) {
      return sendError(res, 'Error verificando ownership', 500);
    }
  };
};

// Middleware para validar refresh token
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token requerido');
    }

    const { verifyRefreshToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    // Buscar usuario
    const usuario = await Usuario.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      throw ApiError.unauthorized(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    if (!usuario.activo) {
      throw ApiError.forbidden(MENSAJES_ERROR.USUARIO_INACTIVO);
    }

    req.user = usuario;
    req.refreshTokenPayload = decoded;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, error.message, error.statusCode);
    }
    return sendError(res, 'Refresh token inválido', 401);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireEmailVerification,
  requireOwnership,
  validateRefreshToken
};