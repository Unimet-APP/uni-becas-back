const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const postulacionesPlazasController = require('../controllers/postulacionesPlazasController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: PostulacionesPlazas
 *   description: Gestión de postulaciones a plazas con aprobación administrativa
 */

/**
 * @swagger
 * /api/v1/postulaciones-plazas:
 *   get:
 *     summary: Listar todas las postulaciones a plazas (admin)
 *     description: |
 *       Obtiene todas las postulaciones a plazas con filtros opcionales.
 *       Útil para que los administradores revisen postulaciones pendientes y tomen decisiones.
 *     tags: [PostulacionesPlazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Aprobada, Rechazada]
 *         description: Filtrar por estado de postulación
 *       - in: query
 *         name: plazaId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por plaza específica
 *       - in: query
 *         name: estudianteBecarioId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por becario específico
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Número de resultados por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Número de resultados a saltar (paginación)
 *     responses:
 *       200:
 *         description: Postulaciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Postulaciones obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     postulaciones:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  postulacionesPlazasController.getAll
);

/**
 * @swagger
 * /api/v1/postulaciones-plazas/{id}:
 *   get:
 *     summary: Ver detalle de una postulación específica (admin)
 *     description: |
 *       Obtiene información completa de una postulación incluyendo datos del becario, plaza y supervisor.
 *     tags: [PostulacionesPlazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la postulación
 *     responses:
 *       200:
 *         description: Postulación obtenida exitosamente
 *       404:
 *         description: Postulación no encontrada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:id',
  authenticate,
  requireRole(['admin']),
  postulacionesPlazasController.getById
);

/**
 * @swagger
 * /api/v1/postulaciones-plazas/{id}/aprobar:
 *   put:
 *     summary: Aprobar una postulación y asignar plaza al becario (admin)
 *     description: |
 *       Aprueba una postulación pendiente, asigna la plaza al becario automáticamente y rechaza otras postulaciones pendientes del mismo becario.
 *
 *       **Flujo de aprobación:**
 *       1. Valida que postulación esté pendiente
 *       2. Verifica que plaza aún tenga cupos
 *       3. Asigna plaza al becario
 *       4. Incrementa ocupadas en la plaza
 *       5. Marca postulación como aprobada
 *       6. Rechaza automáticamente otras postulaciones pendientes del mismo becario
 *     tags: [PostulacionesPlazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la postulación a aprobar
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observaciones:
 *                 type: string
 *                 description: Observaciones opcionales sobre la aprobación
 *     responses:
 *       200:
 *         description: Postulación aprobada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Postulación aprobada exitosamente. El becario ha sido asignado a la plaza
 *       400:
 *         description: Error de validación (postulación ya procesada, plaza sin cupos, etc.)
 *       404:
 *         description: Postulación no encontrada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
  '/:id/aprobar',
  authenticate,
  requireRole(['admin']),
  postulacionesPlazasController.aprobar
);

/**
 * @swagger
 * /api/v1/postulaciones-plazas/{id}/rechazar:
 *   put:
 *     summary: Rechazar una postulación (admin)
 *     description: |
 *       Rechaza una postulación pendiente con un motivo específico.
 *       El becario podrá ver el motivo del rechazo y postular a otras plazas.
 *     tags: [PostulacionesPlazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la postulación a rechazar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - motivoRechazo
 *             properties:
 *               motivoRechazo:
 *                 type: string
 *                 description: Motivo del rechazo (requerido)
 *                 example: El perfil del estudiante no cumple con los requisitos de la plaza
 *               observaciones:
 *                 type: string
 *                 description: Observaciones adicionales opcionales
 *     responses:
 *       200:
 *         description: Postulación rechazada exitosamente
 *       400:
 *         description: Error de validación (postulación ya procesada, motivo faltante, etc.)
 *       404:
 *         description: Postulación no encontrada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
  '/:id/rechazar',
  authenticate,
  requireRole(['admin']),
  postulacionesPlazasController.rechazar
);

module.exports = router;
