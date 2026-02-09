const express = require('express');
const router = express.Router();
const reportesExportController = require('../controllers/reportesExportController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

/**
 * Rutas de Exportación de Reportes
 *
 * Todos los endpoints requieren autenticación.
 * La mayoría requieren rol de supervisor o admin.
 *
 * Parámetros comunes en query:
 * - formato: 'excel' | 'pdf' | 'json' (default: 'json')
 * - periodo: string (ej: '2025-1')
 * - Filtros específicos según endpoint
 */

/**
 * @route GET /api/v1/reportes/exportar/becarios
 * @desc Exportar lista completa de becarios con progreso
 * @access Supervisor, Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query estado - Filtrar por estado (Activa, Cancelada, etc.)
 * @query tipoBeca - Filtrar por tipo de beca
 * @query periodoInicio - Filtrar por período de inicio
 */
router.get(
  '/becarios',
  authenticate,
  requireRole(['supervisor', 'admin']),
  reportesExportController.exportarBecarios
);

/**
 * @route GET /api/v1/reportes/exportar/plazas
 * @desc Exportar información de plazas con disponibilidad
 * @access Supervisor, Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query estado - Filtrar por estado (Activa, Inactiva)
 * @query departamento - Filtrar por departamento
 * @query tipoAyudantia - Filtrar por tipo de ayudantía
 */
router.get(
  '/plazas',
  authenticate,
  requireRole(['supervisor', 'admin']),
  reportesExportController.exportarPlazas
);

/**
 * @route GET /api/v1/reportes/exportar/supervisores
 * @desc Exportar información de supervisores con carga de trabajo
 * @access Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query departamento - Filtrar por departamento
 * @query activo - Filtrar por estado activo (true/false)
 */
router.get(
  '/supervisores',
  authenticate,
  requireRole(['admin']),
  reportesExportController.exportarSupervisores
);

/**
 * @route GET /api/v1/reportes/exportar/actividades
 * @desc Exportar estadísticas de reportes de actividades
 * @access Supervisor, Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query periodo - Filtrar por período académico
 * @query tipoBeca - Filtrar por tipo de beca
 * @query supervisorId - Filtrar por supervisor
 */
router.get(
  '/actividades',
  authenticate,
  requireRole(['supervisor', 'admin']),
  reportesExportController.exportarActividades
);

/**
 * @route GET /api/v1/reportes/exportar/distribucion-becas
 * @desc Exportar distribución por tipo de beca
 * @access Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query periodo - Filtrar por período académico
 */
router.get(
  '/distribucion-becas',
  authenticate,
  requireRole(['admin']),
  reportesExportController.exportarDistribucionBecas
);

/**
 * @route GET /api/v1/reportes/exportar/distribucion-postulantes
 * @desc Exportar distribución por tipo de postulante
 * @access Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query periodo - Filtrar por período académico
 * @query tipoBeca - Filtrar por tipo de beca
 */
router.get(
  '/distribucion-postulantes',
  authenticate,
  requireRole(['admin']),
  reportesExportController.exportarDistribucionPostulantes
);

/**
 * @route GET /api/v1/reportes/exportar/orientacion-vocacional
 * @desc Exportar datos de orientación vocacional (tests, perfiles RIASEC, usuarios evaluados)
 * @access Admin, Especialista
 * @query formato - Formato de exportación (excel, pdf, json)
 */
router.get(
  '/orientacion-vocacional',
  authenticate,
  requireRole(['admin', 'especialista']),
  reportesExportController.exportarOrientacionVocacional
);

/**
 * @route GET /api/v1/reportes/exportar/dashboard
 * @desc Exportar dashboard completo con todos los datos
 * @access Gestor de Becas
 * @query formato - Formato de exportación (excel, pdf, json)
 * @query periodo - Filtrar por período académico
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole(['admin']),
  reportesExportController.exportarDashboardCompleto
);

module.exports = router;
