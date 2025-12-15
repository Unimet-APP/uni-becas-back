const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { sendError } = require('../config/responses');
const { MENSAJES_ERROR, VALIDACIONES } = require('../config/constants');

const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Si es un ApiError personalizado, usar directamente
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode, {
      timestamp: err.timestamp,
      isOperational: err.isOperational,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const validationErrors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));

    return sendError(res, 'Errores de validación en los datos', 400, {
      validationErrors,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Error de clave única (duplicado)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    let message = 'Ya existe un registro con estos datos';

    // Mensajes específicos para campos comunes
    if (field === 'email') {
      message = 'Este email ya está registrado';
    } else if (field === 'cedula') {
      message = 'Esta cédula ya está registrada';
    }

    return sendError(res, message, 409, {
      field,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Error de clave foránea
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return sendError(res, 'Referencia inválida a otro recurso', 400, {
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Error de sintaxis de base de datos (datos inválidos)
  if (err.name === 'SequelizeDatabaseError') {
    let message = 'Error en los datos enviados a la base de datos';

    // Detectar errores específicos de PostgreSQL
    const originalError = err.original?.message || err.message;

    // Error de sintaxis de tipo (ej: NaN en campo integer)
    if (originalError.includes('invalid input syntax for type')) {
      message = 'Uno o más campos contienen datos en formato inválido. Verifica que los números y fechas sean correctos';

      // Extraer el tipo de dato si es posible
      const tipoMatch = originalError.match(/invalid input syntax for type (\w+)/);
      if (tipoMatch) {
        const tipo = tipoMatch[1];
        message = `Formato inválido para campo de tipo ${tipo}. Verifica que los datos sean correctos`;
      }
    }

    return sendError(res, message, 400, {
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        originalError: originalError
      })
    });
  }

  // Error de conexión a la base de datos
  if (err.name === 'SequelizeConnectionError') {
    logger.error('Database connection error:', err);
    return sendError(res, 'Error de conexión con la base de datos', 503);
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, MENSAJES_ERROR.TOKEN_EXPIRADO, 401);
  }

  // Errores de Multer (archivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxSizeMB = Math.round(VALIDACIONES.MAX_FILE_SIZE / 1048576); // Ahora = 10MB
    return sendError(res, `Archivo demasiado grande. Máximo ${maxSizeMB}MB`, 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return sendError(res, 'Demasiados archivos enviados', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Campo de archivo inesperado', 400);
  }

  // Errores de tipo MIME no permitido
  if (err.code === 'INVALID_FILE_TYPE') {
    return sendError(res, 'Tipo de archivo no permitido. Solo PDF, JPG, PNG', 400);
  }

  // Errores de validación de Joi
  if (err.isJoi) {
    const validationErrors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return sendError(res, 'Datos de entrada inválidos', 400, {
      validationErrors,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'JSON malformado en el cuerpo de la solicitud', 400);
  }

  // Errores de Express (too many requests, etc.)
  if (err.status === 429) {
    return sendError(res, 'Demasiadas solicitudes. Intenta más tarde', 429);
  }

  // Error interno del servidor (no manejado)
  logger.error('Unhandled error:', err);
  return sendError(res, MENSAJES_ERROR.ERROR_INTERNO, 500, {
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.message
    })
  });
};

// Middleware para rutas no encontradas
const notFound = (req, res, next) => {
  return sendError(res, `Ruta no encontrada - ${req.method} ${req.originalUrl}`, 404);
};

// Middleware para capturar errores asíncronos
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware de validación para parámetros de ID
const validateIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    // Validar que sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return sendError(res, `ID inválido: ${paramName}`, 400);
    }

    next();
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  validateIdParam
};