const configuracionService = require('../services/configuracionService');
const configuracionBecasService = require('../services/configuracionBecasService');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');

class ConfiguracionController {
  /**
   * GET /api/v1/configuracion/periodo-actual
   * Obtener la configuración del período académico activo
   */
  getPeriodoActivo = asyncHandler(async (req, res) => {
    const configuracion = await configuracionService.getConfiguracionActual();

    return sendSuccess(res, configuracion, 'Configuración del período activo obtenida exitosamente');
  });

  /**
   * GET /api/v1/configuracion/periodos
   * Obtener todos los períodos académicos
   */
  getTodosPeriodos = asyncHandler(async (req, res) => {
    const resultado = await configuracionService.getTodosPeriodos();

    return sendSuccess(res, resultado, 'Períodos académicos obtenidos exitosamente');
  });

  /**
   * GET /api/v1/configuracion/periodos/:id
   * Obtener un período específico por ID
   */
  getPeriodoById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const periodo = await configuracionService.getPeriodoById(id);

    return sendSuccess(res, periodo, 'Período académico obtenido exitosamente');
  });

  /**
   * POST /api/v1/configuracion/periodos
   * Crear un nuevo período académico (solo admin)
   */
  crearPeriodo = asyncHandler(async (req, res) => {
    const datos = req.body;
    const periodo = await configuracionService.crearPeriodo(datos);

    return sendSuccess(res, periodo, 'Período académico creado exitosamente', 201);
  });

  /**
   * PUT /api/v1/configuracion/periodos/:id
   * Actualizar un período académico (solo admin)
   */
  actualizarPeriodo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const datos = req.body;
    const periodo = await configuracionService.actualizarPeriodo(id, datos);

    return sendSuccess(res, periodo, 'Período académico actualizado exitosamente');
  });

  /**
   * DELETE /api/v1/configuracion/periodos/:id
   * Eliminar un período académico (solo admin)
   */
  eliminarPeriodo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resultado = await configuracionService.eliminarPeriodo(id);

    return sendSuccess(res, resultado, 'Período académico eliminado exitosamente');
  });

  /**
   * POST /api/v1/configuracion/periodos/:id/activar
   * Activar un período académico (solo admin)
   */
  activarPeriodo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const periodo = await configuracionService.activarPeriodo(id);

    return sendSuccess(res, periodo, 'Período académico activado exitosamente');
  });

  /**
   * PUT /api/v1/configuracion/semana-actual
   * Cambiar la semana actual del período activo (solo admin)
   */
  cambiarSemanaActual = asyncHandler(async (req, res) => {
    const { semana } = req.body;
    const periodo = await configuracionService.cambiarSemanaActual(semana);

    return sendSuccess(res, periodo, `Semana actual cambiada a ${semana} exitosamente`);
  });

  /**
   * POST /api/v1/configuracion/habilitar-semana
   * Habilitar una semana para reportes (solo admin)
   * Desbloquea automáticamente todos los reportes de esa semana
   */
  habilitarSemana = asyncHandler(async (req, res) => {
    const { semana, periodoId } = req.body;
    const periodo = await configuracionService.habilitarSemana(semana, periodoId);

    return sendSuccess(res, periodo, `Semana ${semana} habilitada exitosamente para reportes`);
  });

  /**
   * POST /api/v1/configuracion/deshabilitar-semana
   * Deshabilitar una semana para reportes (solo admin)
   * Bloquea automáticamente todos los reportes de esa semana
   */
  deshabilitarSemana = asyncHandler(async (req, res) => {
    const { semana, periodoId } = req.body;
    const periodo = await configuracionService.deshabilitarSemana(semana, periodoId);

    return sendSuccess(res, periodo, `Semana ${semana} deshabilitada exitosamente para reportes`);
  });

  /**
   * GET /api/v1/configuracion/verificar-semana
   * Verificar si una semana está habilitada
   */
  verificarSemana = asyncHandler(async (req, res) => {
    const { semana, periodoAcademico } = req.query;
    const resultado = await configuracionService.estaSemanaHabilitada(
      parseInt(semana),
      periodoAcademico
    );

    return sendSuccess(res, resultado, 'Verificación de semana completada');
  });

  /**
   * POST /api/v1/configuracion/bloquear-reportes-semana
   * Bloquear masivamente todos los reportes de una semana (solo admin)
   */
  bloquearReportesSemana = asyncHandler(async (req, res) => {
    const { semana, periodoAcademico } = req.body;

    // Si no se proporciona periodoAcademico, usar el activo
    let periodo = periodoAcademico;
    if (!periodo) {
      const periodoActivo = await configuracionService.getPeriodoActivo();
      periodo = periodoActivo.periodoAcademico;
    }

    const resultado = await configuracionService.bloquearReportesPorSemana(periodo, semana);

    return sendSuccess(
      res,
      resultado,
      `${resultado.reportesBloqueados} reportes bloqueados para la semana ${semana}`
    );
  });

  /**
   * POST /api/v1/configuracion/desbloquear-reportes-semana
   * Desbloquear masivamente todos los reportes de una semana (solo admin)
   */
  desbloquearReportesSemana = asyncHandler(async (req, res) => {
    const { semana, periodoAcademico } = req.body;

    // Si no se proporciona periodoAcademico, usar el activo
    let periodo = periodoAcademico;
    if (!periodo) {
      const periodoActivo = await configuracionService.getPeriodoActivo();
      periodo = periodoActivo.periodoAcademico;
    }

    const resultado = await configuracionService.desbloquearReportesPorSemana(periodo, semana);

    return sendSuccess(
      res,
      resultado,
      `${resultado.reportesDesbloqueados} reportes desbloqueados para la semana ${semana}`
    );
  });

  /**
   * GET /api/v1/configuracion/semanas-habilitadas
   * Obtener lista de semanas habilitadas del período activo
   */
  getSemanasHabilitadas = asyncHandler(async (req, res) => {
    const configuracion = await configuracionService.getConfiguracionActual();

    const resultado = {
      periodoAcademico: configuracion.periodoAcademico,
      semanasHabilitadas: configuracion.semanasHabilitadas,
      totalSemanasHabilitadas: configuracion.totalSemanasHabilitadas,
      semanaActual: configuracion.semanaActual
    };

    return sendSuccess(res, resultado, 'Semanas habilitadas obtenidas exitosamente');
  });

  // ========================================
  // Configuración de Becas
  // ========================================

  /**
   * GET /api/v1/configuracion/becas
   * Listar configuraciones de becas con filtros opcionales
   */
  listarConfiguracionesBecas = asyncHandler(async (req, res) => {
    const { tipoBeca, subtipoExcelencia } = req.query;

    const resultado = await configuracionBecasService.listarConfiguraciones({
      tipoBeca,
      subtipoExcelencia
    });

    return sendSuccess(res, resultado, 'Configuraciones de becas obtenidas exitosamente');
  });

  /**
   * PUT /api/v1/configuracion/becas
   * Crear o actualizar configuración de beca (UPSERT)
   */
  upsertConfiguracionBeca = asyncHandler(async (req, res) => {
    const datos = req.body;

    const { configuracion, created } = await configuracionBecasService.upsertConfiguracion(datos);

    const mensaje = created
      ? `Configuración de beca ${configuracion.obtenerIdentificador()} creada exitosamente`
      : `Configuración de beca ${configuracion.obtenerIdentificador()} actualizada exitosamente`;

    const statusCode = created ? 201 : 200;

    return sendSuccess(res, { configuracion, created }, mensaje, statusCode);
  });

  /**
   * GET /api/v1/configuracion/becas/documentos
   * Obtener lista de documentos requeridos para una beca específica
   */
  getDocumentosRequeridosBeca = asyncHandler(async (req, res) => {
    const { tipoBeca, subtipoExcelencia } = req.query;

    const resultado = await configuracionBecasService.obtenerDocumentosRequeridos(
      tipoBeca,
      subtipoExcelencia
    );

    return sendSuccess(res, resultado, 'Documentos requeridos obtenidos exitosamente');
  });

  /**
   * POST /api/v1/configuracion/cerrar-periodo
   * Cerrar período académico activo
   */
  cerrarPeriodo = asyncHandler(async (req, res) => {
    const { confirmar } = req.body;
    const ApiError = require('../utils/ApiError');

    if (confirmar !== true) {
      throw ApiError.badRequest('Debe confirmar el cierre del período con confirmar: true');
    }

    const resultado = await configuracionService.cerrarPeriodo();

    return sendSuccess(res, resultado, 'Período cerrado exitosamente');
  });

  /**
   * POST /api/v1/configuracion/renovar-becario/:id
   * Renovar un becario para el siguiente trimestre
   */
  renovarBecario = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const becario = await configuracionService.renovarBecario(id);

    return sendSuccess(res, becario, 'Becario renovado exitosamente para el nuevo trimestre');
  });
}

module.exports = new ConfiguracionController();
