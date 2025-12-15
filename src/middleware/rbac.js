/**
 * Role-Based Access Control (RBAC) middleware
 * Controls access to endpoints based on user roles
 */

const rbac = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Se requiere autenticación.'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.tipo_usuario)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tienes permisos para realizar esta acción.',
        required_roles: allowedRoles,
        user_role: req.user.tipo_usuario
      });
    }

    next();
  };
};

module.exports = rbac;