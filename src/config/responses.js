const successResponse = (data = null, message = 'Operación exitosa', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return {
    statusCode,
    body: response
  };
};

const errorResponse = (message = 'Error interno del servidor', statusCode = 500, details = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return {
    statusCode,
    body: response
  };
};

const paginatedResponse = (data, pagination, message = 'Datos obtenidos exitosamente') => {
  return successResponse({
    items: data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  }, message);
};

const validationErrorResponse = (errors) => {
  return errorResponse(
    'Errores de validación en los datos enviados',
    400,
    {
      validationErrors: errors
    }
  );
};

const authErrorResponse = (message = 'Credenciales inválidas') => {
  return errorResponse(message, 401);
};

const forbiddenResponse = (message = 'No tienes permisos para realizar esta acción') => {
  return errorResponse(message, 403);
};

const notFoundResponse = (resource = 'Recurso') => {
  return errorResponse(`${resource} no encontrado`, 404);
};

const conflictResponse = (message = 'El recurso ya existe o hay un conflicto') => {
  return errorResponse(message, 409);
};

const businessLogicErrorResponse = (message = 'Error en las reglas de negocio') => {
  return errorResponse(message, 422);
};

// Respuestas específicas del sistema de becas
const loginSuccessResponse = (user, tokens) => {
  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      activo: user.activo,
      emailVerified: user.emailVerified,
      tipoBeca: user.tipoBeca || null
    },
    tokens
  }, 'Inicio de sesión exitoso');
};

const registrationSuccessResponse = (user) => {
  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role
    }
  }, 'Usuario registrado exitosamente. Tu cuenta será activada una vez que un administrador la apruebe.');
};

const postulacionCreatedResponse = (postulacion) => {
  return successResponse(postulacion, 'Postulación creada exitosamente', 201);
};

const postulacionApprovedResponse = (postulacion) => {
  return successResponse(postulacion, 'Postulación aprobada exitosamente');
};

const postulacionRejectedResponse = (postulacion) => {
  return successResponse(postulacion, 'Postulación rechazada');
};

const reporteApprovedResponse = (reporte) => {
  return successResponse(reporte, 'Reporte de actividad aprobado exitosamente');
};

const reporteRejectedResponse = (reporte) => {
  return successResponse(reporte, 'Reporte de actividad rechazado');
};

const plazaAssignedResponse = (plaza, estudiante) => {
  return successResponse({
    plaza,
    estudiante
  }, 'Plaza asignada exitosamente al estudiante');
};

const plazaReleasedResponse = (plaza) => {
  return successResponse(plaza, 'Plaza liberada exitosamente');
};

// Helper para enviar respuesta con Express
const sendResponse = (res, responseObj) => {
  return res.status(responseObj.statusCode).json(responseObj.body);
};

// Helper para enviar respuesta de éxito rápida
const sendSuccess = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
  const response = successResponse(data, message, statusCode);
  return sendResponse(res, response);
};

// Helper para enviar respuesta de error rápida
const sendError = (res, message = 'Error interno del servidor', statusCode = 500, details = null) => {
  const response = errorResponse(message, statusCode, details);
  return sendResponse(res, response);
};

module.exports = {
  // Respuestas base
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  authErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  businessLogicErrorResponse,

  // Respuestas específicas del sistema
  loginSuccessResponse,
  registrationSuccessResponse,
  postulacionCreatedResponse,
  postulacionApprovedResponse,
  postulacionRejectedResponse,
  reporteApprovedResponse,
  reporteRejectedResponse,
  plazaAssignedResponse,
  plazaReleasedResponse,

  // Helpers
  sendResponse,
  sendSuccess,
  sendError
};