const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const citasController = require('../controllers/citasController');
const {
  validateCrearCita,
  validateActualizarCita,
  validateCitaIdParam
} = require('../validators/citasValidators');

/**
 * @swagger
 * tags:
 *   name: Citas de Orientación
 *   description: Gestión de citas entre especialistas y estudiantes
 */

/**
 * @swagger
 * /api/v1/citas/agendar:
 *   post:
 *     summary: Agenda una nueva cita de orientación
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estudiante_id
 *               - fecha
 *               - hora
 *               - motivo
 *             properties:
 *               estudiante_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2026-02-10"
 *               hora:
 *                 type: string
 *                 format: time
 *                 example: "14:30"
 *               modalidad:
 *                 type: string
 *                 enum: [presencial, virtual, telefonica]
 *                 default: presencial
 *               motivo:
 *                 type: string
 *                 example: "Orientación vocacional"
 *               notas:
 *                 type: string
 *                 example: "El estudiante solicitó revisar opciones de becas"
 *     responses:
 *       201:
 *         description: Cita agendada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Estudiante no encontrado
 */
router.post(
  '/agendar',
  authenticate,
  validateCrearCita,
  citasController.agendarCita
);

/**
 * @swagger
 * /api/v1/citas/mis-citas:
 *   get:
 *     summary: Obtiene las citas del especialista autenticado
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, confirmada, completada, cancelada]
 *         description: Filtrar por estado de la cita
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial para filtrar
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final para filtrar
 *     responses:
 *       200:
 *         description: Citas obtenidas exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/mis-citas',
  authenticate,
  citasController.obtenerMisCitas
);

/**
 * @swagger
 * /api/v1/citas/estudiante/{estudianteId}:
 *   get:
 *     summary: Obtiene las citas de un estudiante específico
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estudianteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Citas del estudiante obtenidas exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/estudiante/:estudianteId',
  authenticate,
  citasController.obtenerCitasEstudiante
);

/**
 * @swagger
 * /api/v1/citas/{citaId}:
 *   get:
 *     summary: Obtiene los detalles de una cita específica
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cita obtenida exitosamente
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Cita no encontrada
 */
router.get(
  '/:citaId',
  authenticate,
  validateCitaIdParam,
  citasController.obtenerCita
);

/**
 * @swagger
 * /api/v1/citas/{citaId}:
 *   patch:
 *     summary: Actualiza una cita existente
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *               hora:
 *                 type: string
 *                 format: time
 *               modalidad:
 *                 type: string
 *                 enum: [presencial, virtual, telefonica]
 *               motivo:
 *                 type: string
 *               notas:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [pendiente, confirmada, completada, cancelada]
 *               notas_seguimiento:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Cita no encontrada
 */
router.patch(
  '/:citaId',
  authenticate,
  validateCitaIdParam,
  validateActualizarCita,
  citasController.actualizarCita
);

/**
 * @swagger
 * /api/v1/citas/{citaId}/cancelar:
 *   delete:
 *     summary: Cancela una cita
 *     tags: [Citas de Orientación]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Cita no encontrada
 */
router.delete(
  '/:citaId/cancelar',
  authenticate,
  validateCitaIdParam,
  citasController.cancelarCita
);

module.exports = router;
