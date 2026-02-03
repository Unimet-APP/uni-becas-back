const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificacionesController = require('../controllers/notificacionesController');

/**
 * @swagger
 * tags:
 *   name: Notificaciones
 *   description: Sistema de notificaciones para estudiantes
 */

/**
 * @swagger
 * /api/v1/notificaciones/mis-notificaciones:
 *   get:
 *     summary: Obtiene todas las notificaciones del usuario autenticado
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de notificaciones a retornar
 *       - in: query
 *         name: solo_no_leidas
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Si es true, solo retorna notificaciones no leídas
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/mis-notificaciones',
  authenticate,
  notificacionesController.obtenerMisNotificaciones
);

/**
 * @swagger
 * /api/v1/notificaciones/contador-no-leidas:
 *   get:
 *     summary: Obtiene el contador de notificaciones no leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contador obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/contador-no-leidas',
  authenticate,
  notificacionesController.contadorNoLeidas
);

/**
 * @swagger
 * /api/v1/notificaciones/{id}/marcar-leida:
 *   patch:
 *     summary: Marca una notificación como leída
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 *       404:
 *         description: Notificación no encontrada
 *       401:
 *         description: No autenticado
 */
router.patch(
  '/:id/marcar-leida',
  authenticate,
  notificacionesController.marcarComoLeida
);

/**
 * @swagger
 * /api/v1/notificaciones/marcar-todas-leidas:
 *   patch:
 *     summary: Marca todas las notificaciones del usuario como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas
 *       401:
 *         description: No autenticado
 */
router.patch(
  '/marcar-todas-leidas',
  authenticate,
  notificacionesController.marcarTodasComoLeidas
);

/**
 * @swagger
 * /api/v1/notificaciones/crear:
 *   post:
 *     summary: Crea nuevas notificaciones (solo especialistas/coordinadores)
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinatarios
 *               - titulo
 *               - contenido
 *             properties:
 *               destinatarios:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *               titulo:
 *                 type: string
 *                 example: "Feria de Carreras 2025"
 *               contenido:
 *                 type: string
 *                 example: "Te invitamos a participar en nuestra feria..."
 *               tipo:
 *                 type: string
 *                 enum: [evento, anuncio, recordatorio, campana, mensaje]
 *                 default: anuncio
 *               metadata:
 *                 type: object
 *                 example: { "url": "https://unimet.edu.ve/feria", "cta": "Registrarme" }
 *     responses:
 *       200:
 *         description: Notificaciones creadas exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/crear',
  authenticate,
  notificacionesController.crearNotificacion
);

/**
 * @swagger
 * /api/v1/notificaciones/{id}:
 *   delete:
 *     summary: Elimina una notificación
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación eliminada exitosamente
 *       404:
 *         description: Notificación no encontrada
 *       401:
 *         description: No autenticado
 */
router.delete(
  '/:id',
  authenticate,
  notificacionesController.eliminarNotificacion
);

module.exports = router;
