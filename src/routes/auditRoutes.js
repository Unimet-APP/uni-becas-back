const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auditoría
 *   description: Consulta de logs de auditoría del sistema
 */

/**
 * @swagger
 * /api/v1/audit/logs:
 *   get:
 *     summary: Consultar logs de auditoría (solo admin)
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accion
 *         schema:
 *           type: string
 *           example: CREATE_POSTULACION
 *         description: Filtrar por tipo de acción
 *       - in: query
 *         name: usuarioId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario específico
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-01-01
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-01-31
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Logs de auditoría obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       usuarioId:
 *                         type: string
 *                         format: uuid
 *                       accion:
 *                         type: string
 *                         example: CREATE_POSTULACION
 *                       detalles:
 *                         type: object
 *                       ipAddress:
 *                         type: string
 *                         example: 192.168.1.100
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   example: 250
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/logs', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  return sendSuccess(res, { logs: [], total: 0 }, 'Logs de auditoría obtenidos');
}));

/**
 * @swagger
 * /api/v1/audit/usuario/{id}:
 *   get:
 *     summary: Ver actividad de un usuario específico
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Actividad del usuario obtenida
 */
router.get('/usuario/:id', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  return sendSuccess(res, { actividades: [], total: 0 }, 'Actividad obtenida');
}));

/**
 * @swagger
 * /api/v1/audit/acciones:
 *   get:
 *     summary: Listar tipos de acciones disponibles
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de acciones
 */
router.get('/acciones', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    acciones: [
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_POSTULACION',
      'APPROVE_POSTULACION',
      'REJECT_POSTULACION',
      'REGISTER_HOURS',
      'APPROVE_HOURS',
      'CREATE_EVALUATION',
      'LOGIN',
      'LOGOUT'
    ]
  }, 'Tipos de acciones obtenidos');
}));

module.exports = router;