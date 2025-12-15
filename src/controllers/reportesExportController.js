const ExportService = require('../services/reportes/exportService');
const { sendSuccess, sendError } = require('../config/responses');
const logger = require('../utils/logger');

/**
 * Controlador de Exportación de Reportes
 *
 * Maneja 7 endpoints para exportar reportes en diferentes formatos:
 * 1. Becarios
 * 2. Plazas
 * 3. Supervisores
 * 4. Actividades
 * 5. Distribución por tipo de beca
 * 6. Distribución por tipo de postulante
 * 7. Dashboard completo
 *
 * Formatos soportados: excel, pdf, json
 */

class ReportesExportController {
  constructor() {
    this.exportService = new ExportService();
  }

  /**
   * Exportar lista completa de becarios
   * GET /api/v1/reportes/exportar/becarios?formato=excel|pdf|json&estado=Activa&tipoBeca=Ayudantía
   */
  async exportarBecarios(req, res) {
    try {
      const { formato = 'json', estado, tipoBeca, periodoInicio } = req.query;

      logger.info(`[ReportesExport] Exportando becarios en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { estado, tipoBeca, periodoInicio }
      });

      const filtros = {};
      if (estado) filtros.estado = estado;
      if (tipoBeca) filtros.tipoBeca = tipoBeca;
      if (periodoInicio) filtros.periodoInicio = periodoInicio;

      const resultado = await this.exportService.exportarBecarios(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Reporte de becarios generado exitosamente');
      }

      // Para Excel y PDF, enviar el archivo
      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar becarios:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar información de plazas
   * GET /api/v1/reportes/exportar/plazas?formato=excel|pdf|json&estado=Activa&departamento=Sistemas
   */
  async exportarPlazas(req, res) {
    try {
      const { formato = 'json', estado, departamento, tipoAyudantia } = req.query;

      logger.info(`[ReportesExport] Exportando plazas en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { estado, departamento, tipoAyudantia }
      });

      const filtros = {};
      if (estado) filtros.estado = estado;
      if (departamento) filtros.departamento = departamento;
      if (tipoAyudantia) filtros.tipoAyudantia = tipoAyudantia;

      const resultado = await this.exportService.exportarPlazas(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Reporte de plazas generado exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar plazas:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar información de supervisores
   * GET /api/v1/reportes/exportar/supervisores?formato=excel|pdf|json&departamento=Sistemas
   */
  async exportarSupervisores(req, res) {
    try {
      const { formato = 'json', departamento, activo } = req.query;

      logger.info(`[ReportesExport] Exportando supervisores en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { departamento, activo }
      });

      const filtros = {};
      if (departamento) filtros.departamento = departamento;
      if (activo !== undefined) filtros.activo = activo === 'true';

      const resultado = await this.exportService.exportarSupervisores(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Reporte de supervisores generado exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar supervisores:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar estadísticas de actividades
   * GET /api/v1/reportes/exportar/actividades?formato=excel|pdf|json&periodo=2025-1&tipoBeca=Ayudantía
   */
  async exportarActividades(req, res) {
    try {
      const { formato = 'json', periodo, tipoBeca, supervisorId } = req.query;

      logger.info(`[ReportesExport] Exportando actividades en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { periodo, tipoBeca, supervisorId }
      });

      const filtros = {};
      if (periodo) filtros.periodo = periodo;
      if (tipoBeca) filtros.tipoBeca = tipoBeca;
      if (supervisorId) filtros.supervisorId = supervisorId;

      const resultado = await this.exportService.exportarActividades(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Estadísticas de actividades generadas exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar actividades:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar distribución por tipo de beca
   * GET /api/v1/reportes/exportar/distribucion-becas?formato=excel|pdf|json&periodo=2025-1
   */
  async exportarDistribucionBecas(req, res) {
    try {
      const { formato = 'json', periodo } = req.query;

      logger.info(`[ReportesExport] Exportando distribución por becas en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { periodo }
      });

      const filtros = {};
      if (periodo) filtros.periodo = periodo;

      const resultado = await this.exportService.exportarDistribucionBecas(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Distribución por tipo de beca generada exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar distribución por becas:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar distribución por tipo de postulante
   * GET /api/v1/reportes/exportar/distribucion-postulantes?formato=excel|pdf|json&periodo=2025-1
   */
  async exportarDistribucionPostulantes(req, res) {
    try {
      const { formato = 'json', periodo, tipoBeca } = req.query;

      logger.info(`[ReportesExport] Exportando distribución por postulantes en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { periodo, tipoBeca }
      });

      const filtros = {};
      if (periodo) filtros.periodo = periodo;
      if (tipoBeca) filtros.tipoBeca = tipoBeca;

      const resultado = await this.exportService.exportarDistribucionPostulantes(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Distribución por tipo de postulante generada exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar distribución por postulantes:', error);
      return sendError(res, error.message, 500);
    }
  }

  /**
   * Exportar dashboard completo con todos los datos
   * GET /api/v1/reportes/exportar/dashboard?formato=excel|pdf|json&periodo=2025-1
   */
  async exportarDashboardCompleto(req, res) {
    try {
      const { formato = 'json', periodo } = req.query;

      logger.info(`[ReportesExport] Exportando dashboard completo en formato ${formato}`, {
        usuario: req.user?.id,
        filtros: { periodo }
      });

      const filtros = {};
      if (periodo) filtros.periodo = periodo;

      const resultado = await this.exportService.exportarDashboardCompleto(filtros, formato.toLowerCase());

      if (formato.toLowerCase() === 'json') {
        return sendSuccess(res, resultado.data, 'Dashboard completo generado exitosamente');
      }

      res.setHeader('Content-Type', resultado.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
      return res.send(resultado.buffer);
    } catch (error) {
      logger.error('[ReportesExport] Error al exportar dashboard completo:', error);
      return sendError(res, error.message, 500);
    }
  }
}

// Crear instancia y exportar métodos bindeados
const controller = new ReportesExportController();

module.exports = {
  exportarBecarios: controller.exportarBecarios.bind(controller),
  exportarPlazas: controller.exportarPlazas.bind(controller),
  exportarSupervisores: controller.exportarSupervisores.bind(controller),
  exportarActividades: controller.exportarActividades.bind(controller),
  exportarDistribucionBecas: controller.exportarDistribucionBecas.bind(controller),
  exportarDistribucionPostulantes: controller.exportarDistribucionPostulantes.bind(controller),
  exportarDashboardCompleto: controller.exportarDashboardCompleto.bind(controller)
};
