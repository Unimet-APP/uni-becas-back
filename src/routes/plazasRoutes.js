const express = require('express');
const plazasController = require('../controllers/plazasController');
const postulacionesPlazasController = require('../controllers/postulacionesPlazasController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateCreatePlaza,
  validateUpdatePlaza,
  validatePlazaFilters
} = require('../validators/plazasValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Plazas
 *   description: Gestión de plazas de ayudantía
 */

/**
 * @swagger
 * /api/v1/plazas:
 *   get:
 *     summary: Listar todas las plazas
 *     description: Obtiene un listado de plazas con filtros opcionales. Accesible por todos los roles autenticados.
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Activa, Inactiva, Completa]
 *         description: Filtrar por estado
 *       - in: query
 *         name: tipoAyudantia
 *         schema:
 *           type: string
 *           enum: [academica, administrativa, investigacion]
 *         description: Filtrar por tipo de ayudantía
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *         description: Filtrar por período académico
 *       - in: query
 *         name: disponibles
 *         schema:
 *           type: boolean
 *         description: Filtrar solo plazas disponibles
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre de plaza
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
 *         description: Número de resultados a saltar
 *     responses:
 *       200:
 *         description: Plazas obtenidas exitosamente
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
 *                   example: Plazas obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     plazas:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Plaza'
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/',
  authenticate,
  validatePlazaFilters,
  plazasController.getAllPlazas
);

/**
 * @swagger
 * /api/v1/plazas/disponibles:
 *   get:
 *     summary: Obtener plazas disponibles
 *     description: Lista solo las plazas activas con cupos disponibles
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipoAyudantia
 *         schema:
 *           type: string
 *           enum: [academica, administrativa, investigacion]
 *         description: Filtrar por tipo de ayudantía
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *         description: Filtrar por período académico
 *     responses:
 *       200:
 *         description: Plazas disponibles obtenidas exitosamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/disponibles',
  authenticate,
  plazasController.getPlazasDisponibles
);

/**
 * @swagger
 * /api/v1/plazas/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de plazas
 *     description: Retorna estadísticas generales de las plazas (solo supervisores y admins)
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *         description: Filtrar por período académico
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/estadisticas',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area', 'capital-humano']),
  plazasController.getEstadisticas
);

/**
 * @swagger
 * /api/v1/plazas/{id}:
 *   get:
 *     summary: Obtener una plaza por ID
 *     description: Obtiene los detalles completos de una plaza específica
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
 *     responses:
 *       200:
 *         description: Plaza obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Plaza'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id',
  authenticate,
  plazasController.getPlazaById
);

/**
 * @swagger
 * /api/v1/plazas/{id}/ayudantes:
 *   get:
 *     summary: Obtener ayudantes asignados a una plaza
 *     description: Lista todos los estudiantes becarios asignados a una plaza específica
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
 *     responses:
 *       200:
 *         description: Ayudantes obtenidos exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/ayudantes',
  authenticate,
  plazasController.getAyudantesAsignados
);

/**
 * @swagger
 * /api/v1/plazas/{id}/postulaciones:
 *   get:
 *     summary: Obtener postulaciones a una plaza específica (admin/supervisor)
 *     description: Lista todas las postulaciones (pendientes, aprobadas, rechazadas) a una plaza específica
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Aprobada, Rechazada]
 *         description: Filtrar postulaciones por estado
 *     responses:
 *       200:
 *         description: Postulaciones obtenidas exitosamente
 *       404:
 *         description: Plaza no encontrada
 */
router.get(
  '/:id/postulaciones',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area']),
  postulacionesPlazasController.getPostulacionesByPlaza
);

/**
 * @swagger
 * /api/v1/plazas/{id}/becarios-compatibles:
 *   get:
 *     summary: Obtener becarios compatibles con el horario de la plaza
 *     description: Lista estudiantes becarios de Ayudantía sin plaza asignada cuyo horario coincida con al menos 10 bloques de 30 minutos (o 100% si la plaza tiene < 10 bloques)
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
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
 *         description: Número de resultados a saltar
 *     responses:
 *       200:
 *         description: Becarios compatibles obtenidos exitosamente
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
 *                   example: Encontrados 5 becario(s) compatible(s) con la plaza
 *                 data:
 *                   type: object
 *                   properties:
 *                     plaza:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                         tipoAyudantia:
 *                           type: string
 *                         horario:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               dia:
 *                                 type: string
 *                               horaInicio:
 *                                 type: string
 *                               horaFin:
 *                                 type: string
 *                         totalBloques:
 *                           type: integer
 *                           example: 15
 *                     umbralBloques:
 *                       type: integer
 *                       example: 10
 *                       description: Número mínimo de bloques requeridos para compatibilidad
 *                     becarios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           usuarioId:
 *                             type: string
 *                             format: uuid
 *                           usuario:
 *                             type: object
 *                             properties:
 *                               nombre:
 *                                 type: string
 *                               apellido:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               cedula:
 *                                 type: string
 *                               carrera:
 *                                 type: string
 *                           tipoBeca:
 *                             type: string
 *                             example: Ayudantía
 *                           bloquesMatcheados:
 *                             type: integer
 *                             example: 12
 *                             description: Número de bloques de 30 min que el becario cubre
 *                           totalBloques:
 *                             type: integer
 *                             example: 15
 *                           porcentajeCobertura:
 *                             type: number
 *                             format: float
 *                             example: 80.00
 *                           detallesPorDia:
 *                             type: object
 *                             additionalProperties:
 *                               type: object
 *                               properties:
 *                                 requeridos:
 *                                   type: integer
 *                                 disponibles:
 *                                   type: integer
 *                                 bloques:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/becarios-compatibles',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area', 'capital-humano']),
  plazasController.getBecariosCompatibles
);

/**
 * @swagger
 * /api/v1/plazas:
 *   post:
 *     summary: Crear nueva plaza
 *     description: Crea una nueva plaza de ayudantía (solo administradores)
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlazaCreate'
 *     responses:
 *       201:
 *         description: Plaza creada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/',
  authenticate,
  requireRole(['admin']),
  validateCreatePlaza,
  plazasController.createPlaza
);

/**
 * @swagger
 * /api/v1/plazas/{id}:
 *   put:
 *     summary: Actualizar plaza
 *     description: Actualiza una plaza existente (supervisores y administradores)
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlazaUpdate'
 *     responses:
 *       200:
 *         description: Plaza actualizada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area', 'capital-humano']),
  validateUpdatePlaza,
  plazasController.updatePlaza
);

/**
 * @swagger
 * /api/v1/plazas/{id}:
 *   delete:
 *     summary: Eliminar plaza
 *     description: |
 *       Desactiva una plaza permanentemente (solo administradores).
 *
 *       **Operaciones automáticas:**
 *       - Desasigna automáticamente todos los estudiantes becarios de la plaza
 *       - Desasigna al supervisor responsable
 *       - Cambia el estado de la plaza a 'Inactiva'
 *       - Pone el contador de ocupadas a 0
 *
 *       **Importante:**
 *       - La plaza no se elimina físicamente, solo se marca como 'Inactiva'
 *       - La plaza no aparecerá en listados posteriores
 *       - Los reportes de actividad de estudiantes se mantienen intactos
 *       - La operación es atómica (se usa transacción)
 *
 *       **Respuesta:**
 *       Incluye información sobre cuántos estudiantes fueron desasignados, el supervisor desasignado, y el detalle de cada estudiante afectado.
 *     tags: [Plazas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la plaza
 *     responses:
 *       200:
 *         description: Plaza eliminada exitosamente con información detallada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     mensaje:
 *                       type: string
 *                       example: Plaza desactivada exitosamente
 *                     plazaId:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     estudiantesDesasignados:
 *                       type: integer
 *                       description: Número de estudiantes que fueron desasignados
 *                       example: 2
 *                     supervisorDesasignado:
 *                       type: object
 *                       nullable: true
 *                       description: Información del supervisor que fue desasignado
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                           example: Dr. Juan Pérez
 *                     detalleEstudiantes:
 *                       type: array
 *                       description: Lista detallada de estudiantes desasignados
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nombre:
 *                             type: string
 *                             example: María González
 *                           email:
 *                             type: string
 *                             example: maria.gonzalez@unimet.edu.ve
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  plazasController.deletePlaza
);

module.exports = router;
