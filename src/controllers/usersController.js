const usersService = require('../services/usersService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

class UsersController {
  /**
   * GET /api/v1/users
   * Listar todos los usuarios con filtros opcionales
   */
  getAllUsers = asyncHandler(async (req, res) => {
    const filters = req.query;
    const resultado = await usersService.getAllUsers(filters);

    return sendSuccess(res, resultado, 'Usuarios obtenidos exitosamente');
  });

  /**
   * GET /api/v1/users/:id
   * Obtener un usuario específico por ID
   */
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const usuario = await usersService.getUserById(id);

    return sendSuccess(res, usuario, 'Usuario obtenido exitosamente');
  });

  /**
   * PUT /api/v1/users/:id
   * Actualizar información de un usuario
   */
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const datosActualizacion = req.body;

    // Verificar que el usuario solo pueda actualizar su propio perfil
    // o sea un admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw ApiError.forbidden('No tienes permisos para actualizar este usuario');
    }

    const usuarioActualizado = await usersService.updateUser(id, datosActualizacion);

    return sendSuccess(res, usuarioActualizado, 'Usuario actualizado exitosamente');
  });

  /**
   * PUT /api/v1/users/:id/role
   * Cambiar rol de un usuario (solo admin)
   */
  updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const usuarioActualizado = await usersService.updateUserRole(id, role);

    return sendSuccess(res, usuarioActualizado, 'Rol actualizado exitosamente');
  });

  /**
   * PATCH /api/v1/users/:id/toggle-status
   * Activar/desactivar un usuario (solo admin)
   */
  toggleUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const resultado = await usersService.toggleUserStatus(id);

    return sendSuccess(res, resultado, `Usuario ${resultado.activo ? 'activado' : 'desactivado'} exitosamente`);
  });

  /**
   * DELETE /api/v1/users/:id
   * Eliminar (desactivar) un usuario (solo admin)
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await usersService.deleteUser(id);

    return sendSuccess(res, null, 'Usuario eliminado exitosamente');
  });

  /**
   * GET /api/v1/users/stats
   * Obtener estadísticas de usuarios (solo admin)
   */
  getUserStats = asyncHandler(async (req, res) => {
    const stats = await usersService.getUserStats();

    return sendSuccess(res, stats, 'Estadísticas obtenidas exitosamente');
  });
}

module.exports = new UsersController();