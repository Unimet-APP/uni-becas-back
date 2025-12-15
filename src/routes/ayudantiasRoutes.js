const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const reportesController = require('../controllers/reportesController');
const {
  validateCreateReporte,
  validateUpdateReporte,
  validateAprobarReporte,
  validateRechazarReporte,
  validateReporteFilters
} = require('../validators/reportesValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Ayudantías
 *   description: Gestión de reportes semanales de actividades
 */

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes:
 *   post:
 *     summary: Crear un nuevo reporte semanal de actividades
 *     description: Permite al ayudante crear un reporte semanal. El reporte queda bloqueado automáticamente.
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReporteCreate'
 *     responses:
 *       201:
 *         description: Reporte creado exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/:id/reportes',
  authenticate,
  requireRole(['estudiante', 'admin']),
  validateCreateReporte,
  reportesController.createReporte
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes:
 *   get:
 *     summary: Listar reportes de un estudiante becario
 *     description: Obtiene todos los reportes semanales de un estudiante becario
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *         description: Filtrar por período académico
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Aprobada, Rechazada, En Revisión]
 *         description: Filtrar por estado
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Reportes obtenidos exitosamente
 */
router.get(
  '/:id/reportes',
  authenticate,
  validateReporteFilters,
  reportesController.getReportesByBecario
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/all:
 *   get:
 *     summary: Listar TODOS los reportes sin filtros (diagnóstico)
 *     description: Obtiene todos los reportes semanales sin filtros, incluyendo rechazados. Útil para debugging.
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario o usuarioId
 *     responses:
 *       200:
 *         description: Todos los reportes obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reporte'
 *                     total:
 *                       type: integer
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/reportes/all',
  authenticate,
  reportesController.getAllReportesByBecario
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/semana/{semana}:
 *   get:
 *     summary: Obtener reporte por número de semana
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: semana
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: periodoAcademico
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reporte obtenido exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/reportes/semana/:semana',
  authenticate,
  reportesController.getReporteBySemana
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}:
 *   get:
 *     summary: Obtener un reporte específico
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reporte obtenido exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/reportes/:reporteId',
  authenticate,
  reportesController.getReporteById
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}:
 *   put:
 *     summary: Actualizar un reporte
 *     description: Solo puede editar el propietario si no está bloqueado, o un admin
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReporteUpdate'
 *     responses:
 *       200:
 *         description: Reporte actualizado exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
  '/:id/reportes/:reporteId',
  authenticate,
  validateUpdateReporte,
  reportesController.updateReporte
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}/aprobar:
 *   patch:
 *     summary: Aprobar un reporte
 *     description: Solo supervisores y admins pueden aprobar
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observaciones:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Reporte aprobado exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch(
  '/:id/reportes/:reporteId/aprobar',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area', 'capital-humano']),
  validateAprobarReporte,
  reportesController.aprobarReporte
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}/rechazar:
 *   patch:
 *     summary: Rechazar un reporte de actividades
 *     description: |
 *       Rechaza un reporte de actividades y envía un email de notificación al estudiante con el motivo del rechazo.
 *       El estudiante podrá editar y reenviar el reporte tras recibir la notificación.
 *       **IMPORTANTE**: Si el envío del email falla, la operación completa se revierte (rollback).
 *
 *       Roles permitidos: supervisores, mentores, administradores, directores de área, capital humano.
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la ayudantía
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del reporte a rechazar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - motivo
 *             properties:
 *               motivo:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 description: Motivo del rechazo que será enviado al estudiante por email (mínimo 10, máximo 2000 caracteres)
 *                 example: Las actividades reportadas no corresponden con las asignadas para esta semana. Por favor, verifica las tareas y vuelve a enviar el reporte con las actividades correctas.
 *     responses:
 *       200:
 *         description: Reporte rechazado exitosamente y email enviado al estudiante
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Reporte no encontrado
 *       500:
 *         description: Error al enviar el email de notificación (se revierte el rechazo)
 */
router.patch(
  '/:id/reportes/:reporteId/rechazar',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area', 'capital-humano']),
  validateRechazarReporte,
  reportesController.rechazarReporte
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}/bloquear:
 *   patch:
 *     summary: Bloquear un reporte (solo admin)
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reporte bloqueado
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch(
  '/:id/reportes/:reporteId/bloquear',
  authenticate,
  requireRole(['admin']),
  reportesController.bloquearReporte
);

/**
 * @swagger
 * /api/v1/ayudantias/{id}/reportes/{reporteId}/desbloquear:
 *   patch:
 *     summary: Desbloquear un reporte (solo admin)
 *     tags: [Ayudantías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reporte desbloqueado
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch(
  '/:id/reportes/:reporteId/desbloquear',
  authenticate,
  requireRole(['admin']),
  reportesController.desbloquearReporte
);

module.exports = router;
