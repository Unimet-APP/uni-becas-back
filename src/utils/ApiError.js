class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Solicitud incorrecta') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Acceso prohibido') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflicto con el estado actual del recurso') {
    return new ApiError(409, message);
  }

  static unprocessableEntity(message = 'Datos no válidos') {
    return new ApiError(422, message);
  }

  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message);
  }

  static validationError(message = 'Error de validación') {
    return new ApiError(400, message);
  }

  static duplicateEntry(message = 'El recurso ya existe') {
    return new ApiError(409, message);
  }

  static businessLogicError(message = 'Error en las reglas de negocio') {
    return new ApiError(422, message);
  }

  static notImplemented(message = 'Funcionalidad no implementada') {
    return new ApiError(501, message);
  }

  toJSON() {
    return {
      success: false,
      error: {
        statusCode: this.statusCode,
        message: this.message,
        timestamp: this.timestamp,
        isOperational: this.isOperational
      }
    };
  }
}

module.exports = ApiError;