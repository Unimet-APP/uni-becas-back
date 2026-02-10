const preguntasOrientacionService = require('../services/preguntasOrientacion');
const { sendSuccess, sendError } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controlador para que el especialista gestione preguntas de los tests (Holland, ICO, etc.).
 * Listar, ver, crear, editar y desactivar preguntas.
 */
class PreguntasOrientacionController {
  list = asyncHandler(async (req, res) => {
    const { tipo_test, dimension_principal, activa, page, limit } = req.query;
    const result = await preguntasOrientacionService.listForEspecialista({
      tipo_test: tipo_test || undefined,
      dimension_principal: dimension_principal || undefined,
      activa: activa === 'true' ? true : activa === 'false' ? false : undefined,
      page,
      limit,
    });
    return sendSuccess(res, { items: result.data, pagination: result.pagination }, 'Listado de preguntas', 200);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pregunta = await preguntasOrientacionService.getByIdForEspecialista(id);
    return sendSuccess(res, pregunta, 'Pregunta obtenida');
  });

  create = asyncHandler(async (req, res) => {
    const pregunta = await preguntasOrientacionService.createForEspecialista(req.body);
    return sendSuccess(res, pregunta, 'Pregunta creada correctamente', 201);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pregunta = await preguntasOrientacionService.updateForEspecialista(id, req.body);
    return sendSuccess(res, pregunta, 'Pregunta actualizada correctamente');
  });

  remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await preguntasOrientacionService.deleteForEspecialista(id);
    return sendSuccess(res, null, 'Pregunta desactivada correctamente');
  });
}

module.exports = new PreguntasOrientacionController();
