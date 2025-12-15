const postulacionesService = require('../services/postulacionesService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');

class PostulacionesController {
  // POST /api/v1/postulaciones
  createPostulacion = asyncHandler(async (req, res) => {
    const datosPostulacion = req.body;
    const userId = req.user?.id || null;  // Usuario opcional (puede ser null si es postulación pública)

    const nuevaPostulacion = await postulacionesService.createPostulacion(datosPostulacion, userId);

    return sendSuccess(res, nuevaPostulacion, 'Postulación creada exitosamente', 201);
  });

  // GET /api/v1/postulaciones
  getAllPostulaciones = asyncHandler(async (req, res) => {
    const filters = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const resultado = await postulacionesService.getAllPostulaciones(filters, userId, userRole);

    return sendSuccess(res, resultado, 'Postulaciones obtenidas exitosamente');
  });

  // GET /api/v1/postulaciones/:id
  getPostulacionById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const postulacion = await postulacionesService.getPostulacionById(id, userId, userRole);

    return sendSuccess(res, postulacion, 'Postulación obtenida exitosamente');
  });

  // PUT /api/v1/postulaciones/:id
  updatePostulacion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const datosActualizacion = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const postulacionActualizada = await postulacionesService.updatePostulacion(id, datosActualizacion, userId, userRole);

    return sendSuccess(res, postulacionActualizada, 'Postulación actualizada exitosamente');
  });

  // PUT /api/v1/postulaciones/:id/aprobar
  aprobarPostulacion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { observaciones } = req.body;
    const evaluadorId = req.user.id;

    const postulacionAprobada = await postulacionesService.aprobarPostulacion(id, evaluadorId, observaciones);

    return sendSuccess(res, postulacionAprobada, 'Postulación aprobada exitosamente');
  });

  // PUT /api/v1/postulaciones/:id/rechazar
  rechazarPostulacion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { observaciones } = req.body;
    const evaluadorId = req.user.id;

    const postulacionRechazada = await postulacionesService.rechazarPostulacion(id, evaluadorId, observaciones);

    return sendSuccess(res, postulacionRechazada, 'Postulación rechazada exitosamente');
  });

  // PUT /api/v1/postulaciones/:id/cancelar
  cancelarPostulacion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const postulacionCancelada = await postulacionesService.cancelarPostulacion(id, userId, userRole);

    return sendSuccess(res, postulacionCancelada, 'Postulación cancelada exitosamente');
  });

  // GET /api/v1/postulaciones/stats
  getPostulacionesStats = asyncHandler(async (req, res) => {
    const filters = req.query;

    const stats = await postulacionesService.getPostulacionesStats(filters);

    return sendSuccess(res, stats, 'Estadísticas obtenidas exitosamente');
  });

  // POST /api/v1/postulaciones/registro-directo
  registroDirectoBecario = asyncHandler(async (req, res) => {
    const datosPostulacion = req.body;
    const adminId = req.user.id;

    const resultado = await postulacionesService.registroDirectoBecario(datosPostulacion, adminId);

    return sendSuccess(res, resultado, 'Becario registrado exitosamente', 201);
  });

  // GET /api/v1/postulaciones/verificar?email=xxx (público)
  verificarPostulacionPorEmail = asyncHandler(async (req, res) => {
    const { email } = req.query;

    const postulaciones = await postulacionesService.verificarPorEmail(email);

    return sendSuccess(res, postulaciones, 'Postulaciones encontradas');
  });
}

module.exports = new PostulacionesController();