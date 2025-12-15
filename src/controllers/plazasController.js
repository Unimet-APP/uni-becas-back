const plazasService = require('../services/plazasService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');

class PlazasController {
  /**
   * GET /api/v1/plazas
   * Listar todas las plazas con filtros opcionales
   */
  getAllPlazas = asyncHandler(async (req, res) => {
    const filters = req.query;
    const resultado = await plazasService.getAllPlazas(filters);

    return sendSuccess(res, resultado, 'Plazas obtenidas exitosamente');
  });

  /**
   * GET /api/v1/plazas/disponibles
   * Obtener solo plazas disponibles
   */
  getPlazasDisponibles = asyncHandler(async (req, res) => {
    const filters = req.query;
    const plazas = await plazasService.getPlazasDisponibles(filters);

    return sendSuccess(res, { plazas }, 'Plazas disponibles obtenidas exitosamente');
  });

  /**
   * GET /api/v1/plazas/estadisticas
   * Obtener estadísticas de plazas
   */
  getEstadisticas = asyncHandler(async (req, res) => {
    const filters = req.query;
    const estadisticas = await plazasService.getEstadisticasPlazas(filters);

    return sendSuccess(res, estadisticas, 'Estadísticas obtenidas exitosamente');
  });

  /**
   * GET /api/v1/plazas/:id
   * Obtener una plaza específica por ID
   */
  getPlazaById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const plaza = await plazasService.getPlazaById(id);

    return sendSuccess(res, plaza, 'Plaza obtenida exitosamente');
  });

  /**
   * GET /api/v1/plazas/:id/ayudantes
   * Obtener ayudantes asignados a una plaza
   */
  getAyudantesAsignados = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ayudantes = await plazasService.getAyudantesAsignados(id);

    return sendSuccess(res, { ayudantes }, 'Ayudantes asignados obtenidos exitosamente');
  });

  /**
   * GET /api/v1/plazas/:id/becarios-compatibles
   * Obtener becarios de Ayudantía compatibles con el horario de la plaza
   */
  getBecariosCompatibles = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const resultado = await plazasService.buscarBecariosCompatibles(
      id,
      parseInt(limit),
      parseInt(offset)
    );

    const mensaje = resultado.total > 0
      ? `Encontrados ${resultado.total} becario(s) compatible(s) con la plaza`
      : 'No se encontraron becarios compatibles con el horario de esta plaza';

    return sendSuccess(res, resultado, mensaje);
  });

  /**
   * POST /api/v1/plazas
   * Crear una nueva plaza
   */
  createPlaza = asyncHandler(async (req, res) => {
    const datosPlaza = req.body;
    const nuevaPlaza = await plazasService.createPlaza(datosPlaza);

    return sendSuccess(res, nuevaPlaza, 'Plaza creada exitosamente', 201);
  });

  /**
   * PUT /api/v1/plazas/:id
   * Actualizar una plaza existente
   */
  updatePlaza = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const datosActualizacion = req.body;

    const plazaActualizada = await plazasService.updatePlaza(id, datosActualizacion);

    return sendSuccess(res, plazaActualizada, 'Plaza actualizada exitosamente');
  });

  /**
   * DELETE /api/v1/plazas/:id
   * Eliminar una plaza (soft delete - cambiar a inactiva)
   */
  deletePlaza = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resultado = await plazasService.deletePlaza(id);

    return sendSuccess(res, resultado, 'Plaza eliminada exitosamente');
  });
}

module.exports = new PlazasController();
