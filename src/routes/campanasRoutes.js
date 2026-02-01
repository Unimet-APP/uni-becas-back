const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const campanasController = require('../controllers/campanasController');

/**
 * @swagger
 * tags:
 *   name: Campañas
 *   description: Sistema de campañas masivas de notificaciones por correo
 */

/**
 * @swagger
 * /api/v1/campanas/segmentar-estudiantes:
 *   post:
 *     summary: Segmenta estudiantes según filtros para preparar una campaña
 *     tags: [Campañas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               carreraInteres:
 *                 type: string
 *                 example: "Ingeniería de Sistemas"
 *               nivelRiesgo:
 *                 type: string
 *                 enum: [Alto, Medio, Bajo, todos]
 *                 example: "Medio"
 *               estadoProceso:
 *                 type: string
 *                 enum: [En Proceso, Orientación Completada, Requiere Asesoría, todos]
 *                 example: "En Proceso"
 *               perfilHolland:
 *                 type: string
 *                 example: "R"
 *               grupo:
 *                 type: string
 *                 enum: [ingenieria, artes, ciencias_sociales]
 *                 example: "ingenieria"
 *     responses:
 *       200:
 *         description: Estudiantes segmentados exitosamente
 *       401:
 *         description: No autenticado
 */
router.post(
  '/segmentar-estudiantes',
  authenticate,
  campanasController.segmentarEstudiantes
);

/**
 * @swagger
 * /api/v1/campanas/enviar:
 *   post:
 *     summary: Envía una campaña masiva de correos
 *     tags: [Campañas]
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
 *               - asunto
 *               - contenido
 *             properties:
 *               destinatarios:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *               asunto:
 *                 type: string
 *                 example: "Webinar: Futuro de la IA"
 *               contenido:
 *                 type: string
 *                 example: "<p>Te invitamos a nuestro webinar...</p>"
 *               titulo:
 *                 type: string
 *                 example: "Invitación Especial"
 *               ctaTexto:
 *                 type: string
 *                 example: "Registrarme Ahora"
 *               ctaUrl:
 *                 type: string
 *                 example: "https://unimet.edu.ve/webinar"
 *               usarTemplate:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Campaña enviada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/enviar',
  authenticate,
  campanasController.enviarCampana
);

/**
 * @swagger
 * /api/v1/campanas/enviar-grupo-predefinido:
 *   post:
 *     summary: Envía campaña a un grupo predefinido (ingeniería, artes, ciencias sociales)
 *     tags: [Campañas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grupo
 *               - asunto
 *               - contenido
 *             properties:
 *               grupo:
 *                 type: string
 *                 enum: [ingenieria, artes, ciencias_sociales]
 *                 example: "ingenieria"
 *               asunto:
 *                 type: string
 *                 example: "Webinar: Futuro de la IA"
 *               contenido:
 *                 type: string
 *                 example: "<p>Te invitamos a nuestro webinar sobre Inteligencia Artificial...</p>"
 *               titulo:
 *                 type: string
 *                 example: "Invitación Especial"
 *               ctaTexto:
 *                 type: string
 *                 example: "Registrarme Ahora"
 *               ctaUrl:
 *                 type: string
 *                 example: "https://unimet.edu.ve/webinar"
 *     responses:
 *       200:
 *         description: Campaña enviada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       404:
 *         description: No se encontraron estudiantes para el grupo
 */
router.post(
  '/enviar-grupo-predefinido',
  authenticate,
  campanasController.enviarGrupoPredefinido
);

/**
 * @swagger
 * /api/v1/campanas/enviar-prueba:
 *   post:
 *     summary: Envía un correo de prueba al usuario autenticado
 *     tags: [Campañas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asunto:
 *                 type: string
 *                 example: "Correo de Prueba"
 *     responses:
 *       200:
 *         description: Correo de prueba enviado exitosamente
 *       401:
 *         description: No autenticado
 */
router.post(
  '/enviar-prueba',
  authenticate,
  campanasController.enviarCorreoPrueba
);

/**
 * @swagger
 * /api/v1/campanas/estadisticas:
 *   get:
 *     summary: Obtiene estadísticas de los grupos predefinidos
 *     tags: [Campañas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/estadisticas',
  authenticate,
  campanasController.obtenerEstadisticas
);

module.exports = router;
