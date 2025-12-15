const reportesService = require('../services/reportesService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

class ReportesController {
  /**
   * Helper: Resolver el ID del estudiante becario desde usuarioId o estudianteBecarioId
   * @private
   */
  async _resolverEstudianteBecarioId(id) {
    const { EstudianteBecario } = require('../models');

    // Intentar buscar por ID directo primero (para mantener compatibilidad)
    let becario = await EstudianteBecario.findByPk(id);

    // Si no se encuentra, intentar buscar por usuarioId
    if (!becario) {
      becario = await EstudianteBecario.findOne({
        where: { usuarioId: id }
      });
    }

    // Si aún no se encuentra, lanzar error
    if (!becario) {
      throw ApiError.notFound('Registro de estudiante becario no encontrado. Verifica que tu postulación haya sido aprobada.');
    }

    return becario;
  }
  /**
   * POST /api/v1/ayudantias/:id/reportes
   * Crear un nuevo reporte semanal de actividades
   * El parámetro :id puede ser el ID del EstudianteBecario o el usuarioId
   */
  createReporte = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const datosReporte = req.body;

    // Resolver el estudiante becario desde el ID (puede ser usuarioId o estudianteBecarioId)
    const becario = await this._resolverEstudianteBecarioId(id);

    // Verificar que el usuario autenticado sea el dueño del registro o sea admin
    const isOwner = req.user.id === becario.usuarioId;
    const isAdmin = req.user.puedeAdministrar();

    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('No tienes permisos para crear reportes para este estudiante becario');
    }

    const nuevoReporte = await reportesService.createReporte(becario.id, datosReporte, isAdmin);

    return sendSuccess(res, nuevoReporte, 'Reporte creado exitosamente', 201);
  });

  /**
   * POST /api/v1/reportes
   * Crear un reporte de forma simplificada (sin necesidad de especificar ID de becario)
   * El sistema busca automáticamente el registro de becario del usuario autenticado
   */
  createReporteSimplificado = asyncHandler(async (req, res) => {
    const datosReporte = req.body;
    const { EstudianteBecario, Usuario } = require('../models');

    // Buscar el registro de becario activo del usuario autenticado
    const becario = await EstudianteBecario.findOne({
      where: {
        usuarioId: req.user.id,
        estado: 'Activa'
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'activo']
      }]
    });

    if (!becario) {
      throw ApiError.notFound('No se encontró un registro de beca activo para tu usuario');
    }

    // Validar que el usuario no esté desactivado
    if (!becario.usuario.activo) {
      throw ApiError.forbidden(
        'Tu usuario está desactivado. No puedes registrar reportes en este momento. ' +
        'Contacta al administrador para más información.'
      );
    }

    // Verificar si es admin
    const isAdmin = req.user.puedeAdministrar();

    // Crear el reporte usando el ID del becario encontrado
    const nuevoReporte = await reportesService.createReporte(becario.id, datosReporte, isAdmin);

    return sendSuccess(res, nuevoReporte, 'Reporte creado exitosamente', 201);
  });

  /**
   * GET /api/v1/ayudantias/:id/reportes/all
   * Listar TODOS los reportes de un estudiante becario SIN FILTROS (para debugging)
   * El parámetro :id puede ser el ID del EstudianteBecario o el usuarioId
   */
  getAllReportesByBecario = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Resolver el estudiante becario desde el ID (puede ser usuarioId o estudianteBecarioId)
    const becario = await this._resolverEstudianteBecarioId(id);

    const resultado = await reportesService.getAllReportesByBecario(becario.id);

    return sendSuccess(res, resultado, 'Todos los reportes obtenidos exitosamente (sin filtros)');
  });

  /**
   * GET /api/v1/ayudantias/:id/reportes
   * Listar todos los reportes de un estudiante becario
   * El parámetro :id puede ser el ID del EstudianteBecario o el usuarioId
   */
  getReportesByBecario = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const filtros = req.query;

    // Resolver el estudiante becario desde el ID (puede ser usuarioId o estudianteBecarioId)
    const becario = await this._resolverEstudianteBecarioId(id);

    const resultado = await reportesService.getReportesByBecario(becario.id, filtros);

    return sendSuccess(res, resultado, 'Reportes obtenidos exitosamente');
  });

  /**
   * GET /api/v1/ayudantias/:id/reportes/:reporteId
   * Obtener un reporte específico por ID
   */
  getReporteById = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;

    const reporte = await reportesService.getReporteById(reporteId);

    return sendSuccess(res, reporte, 'Reporte obtenido exitosamente');
  });

  /**
   * GET /api/v1/ayudantias/:id/reportes/semana/:semana
   * Obtener reporte por número de semana
   * El parámetro :id puede ser el ID del EstudianteBecario o el usuarioId
   */
  getReporteBySemana = asyncHandler(async (req, res) => {
    const { id, semana } = req.params;
    const { periodoAcademico } = req.query;

    if (!periodoAcademico) {
      throw ApiError.badRequest('El período académico es requerido');
    }

    // Resolver el estudiante becario desde el ID (puede ser usuarioId o estudianteBecarioId)
    const becario = await this._resolverEstudianteBecarioId(id);

    const reporte = await reportesService.getReporteBySemana(
      becario.id,
      periodoAcademico,
      parseInt(semana)
    );

    return sendSuccess(res, reporte, 'Reporte obtenido exitosamente');
  });

  /**
   * PUT /api/v1/ayudantias/:id/reportes/:reporteId
   * Actualizar un reporte existente
   */
  updateReporte = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;
    const datosActualizacion = req.body;
    const usuario = req.user;

    const reporteActualizado = await reportesService.updateReporte(
      reporteId,
      datosActualizacion,
      usuario
    );

    return sendSuccess(res, reporteActualizado, 'Reporte actualizado exitosamente');
  });

  /**
   * PATCH /api/v1/ayudantias/:id/reportes/:reporteId/aprobar
   * Aprobar un reporte (supervisor o admin)
   */
  aprobarReporte = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;
    const { observaciones } = req.body || {};
    const supervisorId = req.user.id;

    const reporteAprobado = await reportesService.aprobarReporte(
      reporteId,
      supervisorId,
      observaciones
    );

    return sendSuccess(res, reporteAprobado, 'Reporte aprobado exitosamente');
  });

  /**
   * PATCH /api/v1/ayudantias/:id/reportes/:reporteId/rechazar
   * Rechazar un reporte (supervisor o admin)
   */
  rechazarReporte = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;
    const { motivo } = req.body;
    const supervisorId = req.user.id;

    if (!motivo || motivo.trim() === '') {
      throw ApiError.badRequest('El motivo de rechazo es requerido');
    }

    const reporteRechazado = await reportesService.rechazarReporte(
      reporteId,
      supervisorId,
      motivo
    );

    return sendSuccess(res, reporteRechazado, 'Reporte rechazado');
  });

  /**
   * GET /api/v1/supervisores/reportes-pendientes
   * Obtener reportes pendientes de aprobar por supervisor
   */
  getReportesPendientes = asyncHandler(async (req, res) => {
    const supervisorId = req.user.id;
    const filtros = req.query;

    const resultado = await reportesService.getReportesPendientesSupervisor(supervisorId, filtros);

    return sendSuccess(res, resultado, 'Reportes pendientes obtenidos exitosamente');
  });

  /**
   * PATCH /api/v1/ayudantias/:id/reportes/:reporteId/bloquear
   * Bloquear un reporte (solo admin)
   */
  bloquearReporte = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;

    const reporte = await reportesService.bloquearReporte(reporteId);

    return sendSuccess(res, reporte, 'Reporte bloqueado exitosamente');
  });

  /**
   * PATCH /api/v1/ayudantias/:id/reportes/:reporteId/desbloquear
   * Desbloquear un reporte (solo admin)
   */
  desbloquearReporte = asyncHandler(async (req, res) => {
    const { reporteId } = req.params;

    const reporte = await reportesService.desbloquearReporte(reporteId);

    return sendSuccess(res, reporte, 'Reporte desbloqueado exitosamente');
  });

  /**
   * GET /api/v1/reportes/estadisticas
   * Obtener estadísticas de reportes por período
   */
  getEstadisticas = asyncHandler(async (req, res) => {
    const { periodoAcademico } = req.query;

    if (!periodoAcademico) {
      throw ApiError.badRequest('El período académico es requerido');
    }

    const estadisticas = await reportesService.getEstadisticasReportes(periodoAcademico);

    return sendSuccess(res, estadisticas, 'Estadísticas obtenidas exitosamente');
  });

  /**
   * GET /api/v1/reportes/all
   * Obtener TODOS los reportes de TODOS los estudiantes becarios (endpoint global)
   * Solo accesible para administradores, supervisores y capital humano
   */
  getAllReportesGlobal = asyncHandler(async (req, res) => {
    const filtros = req.query;

    // Verificar que el usuario tenga permisos adecuados
    const puedeVerTodos = req.user.puedeAdministrar() ||
                         req.user.role === 'supervisor' ||
                         req.user.role === 'mentor' ||
                         req.user.role === 'director-area' ||
                         req.user.role === 'capital-humano';

    if (!puedeVerTodos) {
      throw ApiError.forbidden('No tienes permisos para ver todos los reportes del sistema');
    }

    const resultado = await reportesService.getAllReportesGlobal(filtros);

    return sendSuccess(res, resultado, 'Reportes globales obtenidos exitosamente');
  });
}

module.exports = new ReportesController();
