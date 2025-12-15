const disponibilidadService = require('../services/disponibilidadService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

class DisponibilidadController {
  /**
   * POST /api/v1/disponibilidad
   * Crear o actualizar disponibilidad horaria del usuario autenticado
   */
  createOrUpdateDisponibilidad = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;
    const { disponibilidad } = req.body;

    const resultado = await disponibilidadService.createOrUpdateDisponibilidad(usuarioId, disponibilidad);

    return sendSuccess(res, resultado, 'Disponibilidad horaria guardada exitosamente', 200);
  });

  /**
   * GET /api/v1/disponibilidad/me
   * Obtener disponibilidad horaria del usuario autenticado
   */
  getMyDisponibilidad = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const disponibilidad = await disponibilidadService.getDisponibilidadByUsuarioId(usuarioId);

    return sendSuccess(res, disponibilidad, 'Disponibilidad horaria obtenida exitosamente');
  });

  /**
   * GET /api/v1/disponibilidad/me/stats
   * Obtener estadísticas de disponibilidad del usuario autenticado
   */
  getMyStats = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const stats = await disponibilidadService.getEstadisticasDisponibilidad(usuarioId);

    return sendSuccess(res, stats, 'Estadísticas de disponibilidad obtenidas exitosamente');
  });

  /**
   * GET /api/v1/disponibilidad/:usuarioId
   * Obtener disponibilidad horaria de un usuario específico (admin/supervisor)
   */
  getDisponibilidadByUsuarioId = asyncHandler(async (req, res) => {
    const { usuarioId } = req.params;

    const disponibilidad = await disponibilidadService.getDisponibilidadByUsuarioId(usuarioId);

    return sendSuccess(res, disponibilidad, 'Disponibilidad horaria obtenida exitosamente');
  });

  /**
   * GET /api/v1/disponibilidad/:usuarioId/stats
   * Obtener estadísticas de disponibilidad de un usuario específico (admin/supervisor)
   */
  getStatsByUsuarioId = asyncHandler(async (req, res) => {
    const { usuarioId } = req.params;

    const stats = await disponibilidadService.getEstadisticasDisponibilidad(usuarioId);

    return sendSuccess(res, stats, 'Estadísticas de disponibilidad obtenidas exitosamente');
  });

  /**
   * GET /api/v1/disponibilidad
   * Listar todas las disponibilidades (admin/supervisor)
   */
  getAllDisponibilidades = asyncHandler(async (req, res) => {
    const filters = req.query;

    const resultado = await disponibilidadService.getAllDisponibilidades(filters);

    return sendSuccess(res, resultado, 'Disponibilidades obtenidas exitosamente');
  });

  /**
   * DELETE /api/v1/disponibilidad
   * Eliminar disponibilidad horaria del usuario autenticado
   */
  deleteMyDisponibilidad = asyncHandler(async (req, res) => {
    const usuarioId = req.user.id;

    const resultado = await disponibilidadService.deleteDisponibilidad(usuarioId);

    return sendSuccess(res, resultado, 'Disponibilidad horaria eliminada exitosamente');
  });

  /**
   * DELETE /api/v1/disponibilidad/:usuarioId
   * Eliminar disponibilidad horaria de un usuario específico (solo admin)
   */
  deleteDisponibilidadByUsuarioId = asyncHandler(async (req, res) => {
    const { usuarioId } = req.params;

    const resultado = await disponibilidadService.deleteDisponibilidad(usuarioId);

    return sendSuccess(res, resultado, 'Disponibilidad horaria eliminada exitosamente');
  });

  /**
   * POST /api/v1/disponibilidad/buscar
   * Buscar ayudantes disponibles en un día y hora específicos
   */
  buscarAyudantesDisponibles = asyncHandler(async (req, res) => {
    const { dia, hora } = req.body;

    if (!dia || !hora) {
      throw ApiError.badRequest('Los campos dia y hora son requeridos');
    }

    const ayudantes = await disponibilidadService.getAyudantesDisponibles(dia, hora);

    return sendSuccess(
      res,
      { ayudantes, total: ayudantes.length, dia, hora },
      `Encontrados ${ayudantes.length} ayudante(s) disponible(s)`
    );
  });

  /**
   * POST /api/v1/disponibilidad/verificar
   * Verificar si un usuario tiene disponibilidad en un día y hora específicos
   */
  verificarDisponibilidad = asyncHandler(async (req, res) => {
    const { usuarioId, dia, hora } = req.body;

    if (!usuarioId || !dia || !hora) {
      throw ApiError.badRequest('Los campos usuarioId, dia y hora son requeridos');
    }

    const disponible = await disponibilidadService.tieneDisponibilidad(usuarioId, dia, hora);

    return sendSuccess(
      res,
      { disponible, usuarioId, dia, hora },
      disponible ? 'Usuario disponible' : 'Usuario no disponible'
    );
  });
}

module.exports = new DisponibilidadController();
