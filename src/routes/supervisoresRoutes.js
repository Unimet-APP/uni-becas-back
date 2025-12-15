const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { sendSuccess } = require('../config/responses');
const { asyncHandler } = require('../middleware/errorHandler');
const supervisoresController = require('../controllers/supervisoresController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Supervisores
 *   description: Funcionalidades específicas para supervisores
 */

/**
 * @swagger
 * /api/v1/supervisores/ayudantes:
 *   get:
 *     summary: Ver ayudantes asignados al supervisor
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ayudantes asignados
 */
router.get('/ayudantes', authenticate, requireRole(['supervisor']), asyncHandler(async (req, res) => {
  return sendSuccess(res, { ayudantes: [], total: 0 }, 'Ayudantes obtenidos exitosamente');
}));

/**
 * @swagger
 * /api/v1/supervisores/horas/{id}/aprobar:
 *   put:
 *     summary: Aprobar horas registradas por un ayudante
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del registro de horas
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observaciones:
 *                 type: string
 *                 example: Trabajo excelente
 *     responses:
 *       200:
 *         description: Horas aprobadas exitosamente
 */
router.put('/horas/:id/aprobar', authenticate, requireRole(['supervisor']), asyncHandler(async (req, res) => {
  return sendSuccess(res, {}, 'Horas aprobadas exitosamente');
}));

/**
 * @swagger
 * /api/v1/supervisores/evaluaciones:
 *   post:
 *     summary: Crear evaluación de desempeño de un ayudante
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ayudantiaId
 *               - desempenio
 *               - puntualidad
 *               - calidadTrabajo
 *               - iniciativa
 *             properties:
 *               ayudantiaId:
 *                 type: string
 *                 format: uuid
 *               desempenio:
 *                 type: string
 *                 enum: [excelente, satisfactorio, deficiente]
 *                 example: satisfactorio
 *               puntualidad:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               calidadTrabajo:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               iniciativa:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comentarios:
 *                 type: string
 *                 example: Muy responsable y comprometido
 *               recomienContinuidad:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Evaluación creada exitosamente
 */
router.post('/evaluaciones', authenticate, requireRole(['supervisor']), asyncHandler(async (req, res) => {
  return sendSuccess(res, {}, 'Evaluación creada exitosamente', 201);
}));

/**
 * @swagger
 * /api/v1/supervisores/evaluaciones-pendientes:
 *   get:
 *     summary: Ver evaluaciones pendientes de realizar
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de evaluaciones pendientes
 */
router.get('/evaluaciones-pendientes', authenticate, requireRole(['supervisor']), asyncHandler(async (req, res) => {
  return sendSuccess(res, { evaluaciones: [], total: 0 }, 'Evaluaciones pendientes obtenidas');
}));

/**
 * @swagger
 * /api/v1/supervisores/ayudantes/all:
 *   get:
 *     summary: Obtener todos los supervisores con sus ayudantes asignados (a través de plazas)
 *     description: |
 *       Lista completa de supervisores con información detallada de sus ayudantes.
 *       Los ayudantes se obtienen a través de las plazas asignadas al supervisor.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *           example: true
 *         description: Filtrar por supervisores activos/inactivos
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: conAyudantes
 *         schema:
 *           type: boolean
 *         description: Si es true, solo retorna supervisores que tienen ayudantes asignados
 *     responses:
 *       200:
 *         description: Lista de supervisores con ayudantes obtenida exitosamente
 */
router.get(
  '/ayudantes/all',
  authenticate,
  requireRole(['supervisor', 'admin']),
  supervisoresController.getAllSupervisoresConAyudantes
);

/**
 * @swagger
 * /api/v1/supervisores/{id}/ayudantes:
 *   get:
 *     summary: Obtener ayudantes de un supervisor específico (a través de sus plazas activas)
 *     description: |
 *       Obtiene la lista de ayudantes asignados a un supervisor a través de sus plazas activas.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del supervisor
 *     responses:
 *       200:
 *         description: Ayudantes del supervisor obtenidos exitosamente
 */
router.get(
  '/:id/ayudantes',
  authenticate,
  requireRole(['supervisor', 'admin']),
  supervisoresController.getAyudantesDeSupervisor
);

/**
 * @swagger
 * /api/v1/supervisores/{supervisorId}/plaza-activa:
 *   get:
 *     summary: Obtener la plaza activa de un supervisor en un período específico
 *     description: |
 *       Obtiene la plaza activa asignada a un supervisor en un período académico.
 *       Un supervisor solo puede tener una plaza activa por período.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supervisorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del supervisor
 *       - in: query
 *         name: periodoAcademico
 *         required: true
 *         schema:
 *           type: string
 *         description: Período académico (ej. "2025-1")
 *         example: "2025-1"
 *     responses:
 *       200:
 *         description: Plaza activa obtenida exitosamente (o null si no tiene)
 */
router.get(
  '/:supervisorId/plaza-activa',
  authenticate,
  requireRole(['supervisor', 'admin']),
  supervisoresController.getPlazaActivaDelSupervisor
);

/**
 * @swagger
 * /api/v1/supervisores:
 *   get:
 *     summary: Obtener lista de supervisores (sin ayudantes - ligera)
 *     description: |
 *       Lista ligera de supervisores sin incluir relaciones.
 *       Ideal para listados rápidos donde solo se necesita información básica.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtrar por supervisores activos/inactivos
 *       - in: query
 *         name: departamento
 *         schema:
 *           type: string
 *         description: Filtrar por departamento
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
 *         description: Lista de supervisores obtenida exitosamente
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  supervisoresController.getAllSupervisores
);

/**
 * @swagger
 * /api/v1/supervisores/{id}:
 *   get:
 *     summary: Obtener supervisor por ID con ayudantes y estadísticas
 *     description: |
 *       Obtiene información completa de un supervisor incluyendo ayudantes (a través de plazas)
 *       y estadísticas de supervisión.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del supervisor
 *     responses:
 *       200:
 *         description: Supervisor obtenido exitosamente
 */
router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'supervisor']),
  supervisoresController.getSupervisorById
);

/**
 * @swagger
 * /api/v1/supervisores/{id}:
 *   patch:
 *     summary: Actualizar información de un supervisor
 *     description: |
 *       Actualiza campos específicos de un supervisor.
 *       Campos permitidos: nombre, apellido, email, telefono, departamento, cargo, activo
 *
 *       **Nota sobre el campo 'activo':**
 *       - Solo administradores pueden modificar el campo 'activo'
 *       - Si se intenta desactivar (activo: false), se verifica que el supervisor no tenga estudiantes activos
 *       - Si tiene estudiantes activos, la desactivación será bloqueada
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefono:
 *                 type: string
 *               departamento:
 *                 type: string
 *               cargo:
 *                 type: string
 *               activo:
 *                 type: boolean
 *                 description: Estado del supervisor (solo admin puede modificar)
 *     responses:
 *       200:
 *         description: Supervisor actualizado exitosamente
 *       400:
 *         description: No se puede desactivar supervisor con estudiantes activos
 *       403:
 *         description: Solo administradores pueden modificar el campo activo
 */
router.patch(
  '/:id',
  authenticate,
  requireRole(['admin']),
  supervisoresController.updateSupervisor
);

/**
 * @swagger
 * /api/v1/supervisores/{id}:
 *   delete:
 *     summary: Desactivar un supervisor (borrado lógico)
 *     description: |
 *       Desactiva un supervisor.
 *       NOTA: Las plazas del supervisor permanecen activas hasta el final del período.
 *     tags: [Supervisores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Supervisor desactivado exitosamente
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  supervisoresController.deleteSupervisor
);

module.exports = router;
