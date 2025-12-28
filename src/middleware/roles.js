const { sendError } = require('../config/responses');
const { ROLES, MENSAJES_ERROR } = require('../config/constants');

// Middleware principal para verificar roles
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    next();
  };
};

// Middleware para verificar roles específicos del sistema de becas

// Solo estudiantes
const requireEstudiante = requireRoles(ROLES.ESTUDIANTE);

// Solo supervisores
const requireSupervisor = requireRoles(ROLES.SUPERVISOR);

// Solo administradores
const requireAdmin = requireRoles(ROLES.ADMIN);

// Supervisores + Administradores (para gestión de becarios)
const requireSupervisorOrAdmin = requireRoles(
  ROLES.SUPERVISOR,
  ROLES.ADMIN
);

// Estudiantes + Supervisores (para reportes de actividad)
const requireEstudianteOrSupervisor = requireRoles(
  ROLES.ESTUDIANTE,
  ROLES.SUPERVISOR
);

// Middleware con lógica de negocio específica

// Verificar si puede crear postulaciones
const canCreatePostulacion = (req, res, next) => {
  if (!req.user) {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  if (!req.user.puedePostular()) {
    return sendError(res, 'No tienes permisos para crear postulaciones', 403);
  }

  next();
};

// Verificar si puede evaluar (aprobar/rechazar postulaciones o reportes)
const canEvaluate = (req, res, next) => {
  if (!req.user) {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  if (!req.user.puedeEvaluar()) {
    return sendError(res, 'No tienes permisos para evaluar', 403);
  }

  next();
};

// Verificar si puede administrar el sistema
const canAdministrate = (req, res, next) => {
  if (!req.user) {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  if (!req.user.puedeAdministrar()) {
    return sendError(res, 'No tienes permisos de administración', 403);
  }

  next();
};

// Middleware para verificar acceso a recursos específicos por rol
const checkResourceAccess = (resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
    }

    const userRole = req.user.role;

    switch (resourceType) {
      case 'postulaciones':
        // Estudiantes solo ven sus propias postulaciones
        // Admins/supervisores ven todas
        if (userRole === ROLES.ESTUDIANTE) {
          req.query.usuarioId = req.user.id; // Filtrar por usuario actual
        } else if (!req.user.puedeEvaluar() && !req.user.puedeAdministrar()) {
          return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
        }
        break;

      case 'becarios':
        // Solo supervisores y admins pueden acceder
        if (!req.user.puedeEvaluar() && !req.user.puedeAdministrar()) {
          return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
        }
        break;

      case 'plazas':
        // Estudiantes pueden ver plazas disponibles
        // Admins pueden gestionar plazas
        if (req.method !== 'GET' && !req.user.puedeAdministrar()) {
          return sendError(res, 'Solo administradores pueden gestionar plazas', 403);
        }
        break;

      case 'reportes':
        // Estudiantes solo ven sus propios reportes
        // Supervisores ven reportes de sus estudiantes asignados
        // Admins ven todos
        if (userRole === ROLES.ESTUDIANTE) {
          req.query.estudianteId = req.user.id;
        } else if (!req.user.puedeEvaluar() && !req.user.puedeAdministrar()) {
          return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
        }
        break;

      case 'estadisticas':
        // Solo supervisores y admins pueden ver estadísticas
        if (!req.user.puedeEvaluar() && !req.user.puedeAdministrar()) {
          return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
        }
        break;

      default:
        return sendError(res, 'Tipo de recurso no válido', 400);
    }

    next();
  };
};

// Middleware para verificar ownership de recursos con excepción para admins
const requireOwnershipOrAdmin = (resourceUserIdField = 'usuarioId') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
    }

    // Si es admin, permitir acceso total
    if (req.user.puedeAdministrar()) {
      return next();
    }

    // Verificar ownership del recurso
    const resourceUserId = req.body[resourceUserIdField] ||
                         req.params[resourceUserIdField] ||
                         req.query[resourceUserIdField] ||
                         req.resource?.[resourceUserIdField]; // Si el recurso ya fue cargado

    if (!resourceUserId) {
      return sendError(res, 'No se puede determinar el propietario del recurso', 400);
    }

    if (resourceUserId !== req.user.id) {
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    next();
  };
};

// Middleware para verificar si un supervisor puede evaluar a un estudiante específico
const canEvaluateStudent = async (req, res, next) => {
  if (!req.user) {
    return sendError(res, MENSAJES_ERROR.TOKEN_INVALIDO, 401);
  }

  // Solo supervisores pueden evaluar
  if (!req.user.puedeEvaluar()) {
    return sendError(res, 'Solo supervisores pueden evaluar estudiantes', 403);
  }

  // Si es admin, permitir evaluar cualquier estudiante
  if (req.user.puedeAdministrar()) {
    return next();
  }

  // Verificar si el supervisor está asignado al estudiante
  try {
    const { EstudianteBecario } = require('../models');
    const becarioId = req.params.id || req.params.becarioId || req.body.estudianteBecarioId;

    if (!becarioId) {
      // Si no hay ID de becario, permitir (se validará en el controlador)
      return next();
    }

    const becario = await EstudianteBecario.findByPk(becarioId);

    if (!becario) {
      return sendError(res, 'Estudiante becario no encontrado', 404);
    }

    // Verificar que el supervisor autenticado sea el asignado al becario
    if (becario.supervisorId !== req.user.id) {
      return sendError(
        res,
        'No tienes permisos para evaluar a este estudiante. Solo puedes evaluar a tus estudiantes asignados.',
        403
      );
    }

    // Almacenar el becario en el request para uso posterior
    req.becario = becario;

    next();
  } catch (error) {
    return sendError(res, 'Error verificando asignación de supervisor', 500);
  }
};

// Wrapper simplificado para facilitar uso en rutas
const requireRole = (allowedRoles) => {
  // Si se pasa un array, usar como está
  // Si se pasa un string simple, convertir a array
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return requireRoles(...rolesArray);
};

const requireEspecialista = requireRoles(ROLES.ESPECIALISTA);

const requireEspecialistaOrAdmin = requireRoles(
  ROLES.ESPECIALISTA,
  ROLES.ADMIN
);

const requireEstudianteOrAspirante = requireRoles(
  ROLES.ESTUDIANTE,
  ROLES.ASPIRANTE
);

const requireAccesoOrientacionVocacional = requireRoles(
  ROLES.ESPECIALISTA,
  ROLES.ESTUDIANTE,
  ROLES.ASPIRANTE,
  ROLES.ADMIN
);

module.exports = {
  // Middleware básicos de roles
  requireRoles,
  requireRole, // ← Wrapper simplificado
  requireEstudiante,
  requireSupervisor,
  requireAdmin,
  requireSupervisorOrAdmin,
  requireEstudianteOrSupervisor,
  requireEspecialista,
  requireEspecialistaOrAdmin,
  requireEstudianteOrAspirante,
  requireAccesoOrientacionVocacional,

  // Middleware con lógica de negocio
  canCreatePostulacion,
  canEvaluate,
  canAdministrate,

  // Middleware de acceso a recursos
  checkResourceAccess,
  requireOwnershipOrAdmin,
  canEvaluateStudent
};