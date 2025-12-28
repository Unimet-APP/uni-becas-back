const authService = require('../services/authService');
const { sendSuccess, sendError, loginSuccessResponse, registrationSuccessResponse } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

class AuthController {
  // POST /api/v1/auth/login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const resultado = await authService.login(email, password);

    const response = loginSuccessResponse(resultado.usuario, resultado.tokens);
    return res.status(response.statusCode).json(response.body);
  });

  // POST /api/v1/auth/register
  register = asyncHandler(async (req, res) => {
    const datosUsuario = req.body;

    const nuevoUsuario = await authService.register(datosUsuario);

    const response = registrationSuccessResponse(nuevoUsuario);
    return res.status(response.statusCode).json(response.body);
  });

  // POST /api/v1/auth/logout
  logout = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const resultado = await authService.logout(userId);

    return sendSuccess(res, null, 'Sesión cerrada exitosamente');
  });

  // POST /api/v1/auth/refresh
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const resultado = await authService.refreshToken(refreshToken);

    return sendSuccess(res, resultado, 'Token renovado exitosamente');
  });

  // POST /api/v1/auth/forgot-password
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const resultado = await authService.forgotPassword(email);

    return sendSuccess(res, null, resultado.message);
  });

  // POST /api/v1/auth/reset-password
  resetPassword = asyncHandler(async (req, res) => {
    const { token, nuevaPassword } = req.body;

    const resultado = await authService.resetPassword(token, nuevaPassword);

    return sendSuccess(res, null, 'Contraseña restablecida exitosamente');
  });

  // POST /api/v1/auth/change-password
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { passwordActual, nuevaPassword } = req.body;

    const resultado = await authService.changePassword(userId, passwordActual, nuevaPassword);

    return sendSuccess(res, null, resultado.message);
  });

  // GET /api/v1/auth/profile
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const usuario = await authService.getUserProfile(userId);

    return sendSuccess(res, usuario, 'Perfil obtenido exitosamente');
  });

  // PUT /api/v1/auth/profile
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const datosActualizacion = req.body;

    const usuarioActualizado = await authService.updateProfile(userId, datosActualizacion);

    return sendSuccess(res, usuarioActualizado, 'Perfil actualizado exitosamente');
  });

  // GET /api/v1/auth/me (alias para profile)
  getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const usuario = await authService.getUserProfile(userId);

    return sendSuccess(res, {
      user: usuario,
      permissions: this.getUserPermissions(usuario.role)
    }, 'Usuario actual obtenido exitosamente');
  });

  // POST /api/v1/auth/verify-token
  verifyToken = asyncHandler(async (req, res) => {
    // El middleware de auth ya verificó el token
    // Si llegamos aquí, el token es válido
    return sendSuccess(res, {
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        nombre: req.user.nombre
      }
    }, 'Token válido');
  });

  // PATCH /api/v1/auth/approve/:id
  approveUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const usuarioAprobado = await authService.approveUser(id);

    return sendSuccess(res, usuarioAprobado, 'Usuario aprobado exitosamente. Se ha enviado un correo de notificación.');
  });

   // POST /api/v1/auth/convertir-estudiante
   convertirAspiranteAEstudiante = asyncHandler(async (req, res) => {
     const userId = req.user.id;
     const { emailUnimet, carrera, trimestre } = req.body;

     // Verificar que el usuario sea un aspirante
     if (req.user.role !== 'aspirante') {
       throw ApiError.forbidden('Solo los aspirantes pueden convertirse en estudiantes');
     }

     const estudiante = await authService.convertirAspiranteAEstudiante(
       userId,
       emailUnimet,
       carrera,
       trimestre
     );

     return sendSuccess(
       res,
       estudiante,
       'Tu cuenta ha sido actualizada a estudiante. Bienvenido a la Universidad Metropolitana!',
       200
     );
   });

  // Helper para obtener permisos del usuario basado en su rol
  getUserPermissions(role) {
    const permissions = {
      estudiante: [
        'read:own:postulaciones',
        'create:own:postulaciones',
        'read:own:profile',
        'update:own:profile',
        'read:own:horas',
        'create:own:horas'
      ],
      supervisor: [
        'read:assigned:estudiantes',
        'read:assigned:postulaciones',
        'update:assigned:evaluaciones',
        'read:own:profile',
        'update:own:profile',
        'approve:assigned:horas'
      ],
      mentor: [
        'read:assigned:estudiantes',
        'read:assigned:postulaciones',
        'update:assigned:evaluaciones',
        'read:own:profile',
        'update:own:profile',
        'approve:assigned:horas'
      ],
      admin: [
        'read:all:users',
        'create:all:users',
        'update:all:users',
        'delete:all:users',
        'read:all:postulaciones',
        'update:all:postulaciones',
        'read:all:estadisticas',
        'manage:system:config'
      ],
      'director-area': [
        'read:all:postulaciones',
        'update:all:postulaciones',
        'read:all:estadisticas',
        'read:all:reportes',
        'approve:all:postulaciones'
      ],
      'capital-humano': [
        'read:all:users',
        'update:all:users',
        'read:all:postulaciones',
        'read:all:estadisticas',
        'manage:user:roles'
      ],
      'supervisor-laboral': [
        'read:all:postulaciones',
        'update:all:evaluaciones',
        'read:all:horas',
        'approve:all:horas',
        'read:all:reportes'
      ],
      aspirante: [
        'read:own:perfil',
        'update:own:perfil',
        'create:own:test',
        'read:own:test',
        'read:own:recomendaciones',
        'read:own:notificaciones'
      ],
      especialista: [
        'read:assigned:estudiantes',
        'read:assigned:perfiles',
        'read:assigned:tests',
        'update:assigned:recomendaciones',
        'read:own:profile',
        'update:own:profile',
        'create:seguimientos',
        'read:assigned:seguimientos',
        'review:recomendaciones:ia'
      ]
    };

    return permissions[role] || [];
  }
}

module.exports = new AuthController();