const express = require('express');
const disponibilidadController = require('../controllers/disponibilidadController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateCreateOrUpdateDisponibilidad,
  validateBuscarAyudantes,
  validateVerificarDisponibilidad,
  validateDisponibilidadFilters
} = require('../validators/disponibilidadValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Disponibilidad Horaria
 *   description: Gestión de disponibilidad horaria de ayudantes
 */

/**
 * @swagger
 * /api/v1/disponibilidad:
 *   post:
 *     summary: Crear o actualizar disponibilidad horaria del usuario autenticado
 *     description: |
 *       Permite a un ayudante crear o actualizar su calendario de disponibilidad semanal.
 *       El calendario usa bloques de 30 minutos desde las 06:00 hasta las 22:00.
 *
 *       **Roles permitidos:** ayudante
 *
 *       **Reglas:**
 *       - Solo usuarios con rol ayudante pueden crear disponibilidad
 *       - El usuario debe estar activo
 *       - Se actualiza si ya existe disponibilidad previa
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disponibilidad
 *             properties:
 *               disponibilidad:
 *                 type: object
 *                 required:
 *                   - lunes
 *                   - martes
 *                   - miercoles
 *                   - jueves
 *                   - viernes
 *                   - sabado
 *                   - domingo
 *                 properties:
 *                   lunes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       pattern: '^\d{2}:\d{2}$'
 *                       example: "07:00"
 *                     description: Array de horas disponibles (formato HH:MM)
 *                     example: ["07:00", "07:30", "08:00"]
 *                   martes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["12:30", "13:00"]
 *                   miercoles:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: []
 *                   jueves:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: []
 *                   viernes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["15:00", "15:30", "16:00", "16:30", "17:00"]
 *                   sabado:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: []
 *                   domingo:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: []
 *           examples:
 *             disponibilidadCompleta:
 *               summary: Disponibilidad típica de ayudante
 *               value:
 *                 disponibilidad:
 *                   lunes: ["07:00", "07:30", "08:00"]
 *                   martes: ["12:30", "13:00"]
 *                   miercoles: []
 *                   jueves: []
 *                   viernes: ["15:00", "15:30", "16:00", "16:30", "17:00"]
 *                   sabado: []
 *                   domingo: []
 *     responses:
 *       200:
 *         description: Disponibilidad guardada exitosamente
 *       400:
 *         description: Datos inválidos o usuario no es ayudante
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/',
  authenticate,
  requireRole(['estudiante']),
  validateCreateOrUpdateDisponibilidad,
  disponibilidadController.createOrUpdateDisponibilidad
);

/**
 * @swagger
 * /api/v1/disponibilidad/me:
 *   get:
 *     summary: Obtener disponibilidad horaria del usuario autenticado
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida exitosamente
 *       404:
 *         description: No se encontró disponibilidad para este usuario
 */
router.get(
  '/me',
  authenticate,
  requireRole(['estudiante']),
  disponibilidadController.getMyDisponibilidad
);

/**
 * @swagger
 * /api/v1/disponibilidad/me/stats:
 *   get:
 *     summary: Obtener estadísticas de disponibilidad del usuario autenticado
 *     description: |
 *       Retorna información estadística sobre la disponibilidad horaria:
 *       - Total de bloques seleccionados
 *       - Total de horas semanales
 *       - Distribución por día
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get(
  '/me/stats',
  authenticate,
  requireRole(['estudiante']),
  disponibilidadController.getMyStats
);

/**
 * @swagger
 * /api/v1/disponibilidad:
 *   get:
 *     summary: Listar todas las disponibilidades (admin/supervisor)
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Lista de disponibilidades obtenida exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  validateDisponibilidadFilters,
  disponibilidadController.getAllDisponibilidades
);

/**
 * @swagger
 * /api/v1/disponibilidad/buscar:
 *   post:
 *     summary: Buscar ayudantes disponibles en un día y hora específicos
 *     description: |
 *       Permite buscar todos los ayudantes que tienen disponibilidad
 *       en un día y hora específicos.
 *
 *       **Roles permitidos:** admin, supervisor, mentor, director-area
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dia
 *               - hora
 *             properties:
 *               dia:
 *                 type: string
 *                 enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *                 example: viernes
 *               hora:
 *                 type: string
 *                 pattern: '^\d{2}:\d{2}$'
 *                 example: "15:30"
 *     responses:
 *       200:
 *         description: Lista de ayudantes disponibles
 *       400:
 *         description: Parámetros inválidos
 */
router.post(
  '/buscar',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  validateBuscarAyudantes,
  disponibilidadController.buscarAyudantesDisponibles
);

/**
 * @swagger
 * /api/v1/disponibilidad/verificar:
 *   post:
 *     summary: Verificar si un usuario tiene disponibilidad específica
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuarioId
 *               - dia
 *               - hora
 *             properties:
 *               usuarioId:
 *                 type: string
 *                 format: uuid
 *               dia:
 *                 type: string
 *                 enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *               hora:
 *                 type: string
 *                 pattern: '^\d{2}:\d{2}$'
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */
router.post(
  '/verificar',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  validateVerificarDisponibilidad,
  disponibilidadController.verificarDisponibilidad
);

/**
 * @swagger
 * /api/v1/disponibilidad/{usuarioId}:
 *   get:
 *     summary: Obtener disponibilidad de un usuario específico
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida exitosamente
 *       404:
 *         description: No se encontró disponibilidad
 */
router.get(
  '/:usuarioId',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  disponibilidadController.getDisponibilidadByUsuarioId
);

/**
 * @swagger
 * /api/v1/disponibilidad/{usuarioId}/stats:
 *   get:
 *     summary: Obtener estadísticas de disponibilidad de un usuario
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get(
  '/:usuarioId/stats',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  disponibilidadController.getStatsByUsuarioId
);

/**
 * @swagger
 * /api/v1/disponibilidad:
 *   delete:
 *     summary: Eliminar disponibilidad del usuario autenticado
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disponibilidad eliminada exitosamente
 *       404:
 *         description: No se encontró disponibilidad
 */
router.delete(
  '/',
  authenticate,
  requireRole(['estudiante']),
  disponibilidadController.deleteMyDisponibilidad
);

/**
 * @swagger
 * /api/v1/disponibilidad/{usuarioId}:
 *   delete:
 *     summary: Eliminar disponibilidad de un usuario (solo admin)
 *     tags: [Disponibilidad Horaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Disponibilidad eliminada exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.delete(
  '/:usuarioId',
  authenticate,
  requireRole(['admin']),
  disponibilidadController.deleteDisponibilidadByUsuarioId
);

module.exports = router;
