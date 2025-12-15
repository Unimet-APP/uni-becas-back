const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const configuracionController = require('../controllers/configuracionController');
const {
  validateCrearPeriodo,
  validateActualizarPeriodo,
  validateCambiarSemana,
  validateSemanaAction,
  validateVerificarSemana,
  validateUuidParam
} = require('../validators/configuracionValidators');

const {
  validateListarConfiguraciones,
  validateGetDocumentosRequeridos,
  validateUpsertConfiguracionBeca
} = require('../validators/configuracionBecasValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Configuración
 *   description: Gestión de períodos académicos y configuración de semanas
 */

// ========================================
// Rutas públicas autenticadas
// ========================================

/**
 * @swagger
 * /api/v1/configuracion/periodo-actual:
 *   get:
 *     summary: Obtener configuración del período activo
 *     description: Retorna la configuración completa del período académico actualmente activo
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
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
 *                   example: Configuración del período activo obtenida exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     periodoAcademico:
 *                       type: string
 *                       example: "2025-1"
 *                     semanaActual:
 *                       type: integer
 *                       example: 5
 *                     semanasHabilitadas:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [1, 2, 3, 4, 5]
 *                     totalSemanasHabilitadas:
 *                       type: integer
 *                       example: 5
 *                     fechaInicio:
 *                       type: string
 *                       format: date
 *                     fechaFin:
 *                       type: string
 *                       format: date
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/periodo-actual',
  authenticate,
  configuracionController.getPeriodoActivo
);

/**
 * @swagger
 * /api/v1/configuracion/semanas-habilitadas:
 *   get:
 *     summary: Obtener semanas habilitadas del período activo
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Semanas habilitadas obtenidas exitosamente
 */
router.get(
  '/semanas-habilitadas',
  authenticate,
  configuracionController.getSemanasHabilitadas
);

/**
 * @swagger
 * /api/v1/configuracion/verificar-semana:
 *   get:
 *     summary: Verificar si una semana está habilitada
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semana
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{4}-[1-3]$'
 *     responses:
 *       200:
 *         description: Verificación completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     semana:
 *                       type: integer
 *                     periodoAcademico:
 *                       type: string
 *                     habilitada:
 *                       type: boolean
 */
router.get(
  '/verificar-semana',
  authenticate,
  validateVerificarSemana,
  configuracionController.verificarSemana
);

// ========================================
// Rutas de administración (solo admin)
// ========================================

/**
 * @swagger
 * /api/v1/configuracion/periodos:
 *   get:
 *     summary: Listar todos los períodos académicos
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Períodos obtenidos exitosamente
 */
router.get(
  '/periodos',
  authenticate,
  requireRole(['admin']),
  configuracionController.getTodosPeriodos
);

/**
 * @swagger
 * /api/v1/configuracion/periodos/{id}:
 *   get:
 *     summary: Obtener un período específico
 *     tags: [Configuración]
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
 *         description: Período obtenido exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/periodos/:id',
  authenticate,
  requireRole(['admin']),
  validateUuidParam('id'),
  configuracionController.getPeriodoById
);

/**
 * @swagger
 * /api/v1/configuracion/periodos:
 *   post:
 *     summary: Crear un nuevo período académico
 *     description: Solo administradores pueden crear períodos
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - periodoAcademico
 *             properties:
 *               periodoAcademico:
 *                 type: string
 *                 pattern: '^[0-9]{4}-[1-3]$'
 *                 example: "2025-1"
 *               semanaActual:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 default: 1
 *               semanasHabilitadas:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 12
 *                 example: [1, 2, 3]
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *               fechaFin:
 *                 type: string
 *                 format: date
 *               descripcion:
 *                 type: string
 *                 maxLength: 1000
 *               activo:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Período creado exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Ya existe un período con ese nombre
 */
router.post(
  '/periodos',
  authenticate,
  requireRole(['admin']),
  validateCrearPeriodo,
  configuracionController.crearPeriodo
);

/**
 * @swagger
 * /api/v1/configuracion/periodos/{id}:
 *   put:
 *     summary: Actualizar un período académico
 *     tags: [Configuración]
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
 *               semanaActual:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               fechaInicio:
 *                 type: string
 *                 format: date
 *               fechaFin:
 *                 type: string
 *                 format: date
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Período actualizado exitosamente
 */
router.put(
  '/periodos/:id',
  authenticate,
  requireRole(['admin']),
  validateUuidParam('id'),
  validateActualizarPeriodo,
  configuracionController.actualizarPeriodo
);

/**
 * @swagger
 * /api/v1/configuracion/periodos/{id}:
 *   delete:
 *     summary: Eliminar un período académico
 *     description: No se puede eliminar el período activo
 *     tags: [Configuración]
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
 *         description: Período eliminado exitosamente
 *       400:
 *         description: No se puede eliminar el período activo
 */
router.delete(
  '/periodos/:id',
  authenticate,
  requireRole(['admin']),
  validateUuidParam('id'),
  configuracionController.eliminarPeriodo
);

/**
 * @swagger
 * /api/v1/configuracion/periodos/{id}/activar:
 *   post:
 *     summary: Activar un período académico
 *     description: Desactiva automáticamente todos los demás períodos
 *     tags: [Configuración]
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
 *         description: Período activado exitosamente
 */
router.post(
  '/periodos/:id/activar',
  authenticate,
  requireRole(['admin']),
  validateUuidParam('id'),
  configuracionController.activarPeriodo
);

/**
 * @swagger
 * /api/v1/configuracion/semana-actual:
 *   put:
 *     summary: Cambiar la semana actual del período activo
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semana
 *             properties:
 *               semana:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 5
 *     responses:
 *       200:
 *         description: Semana actual cambiada exitosamente
 */
router.put(
  '/semana-actual',
  authenticate,
  requireRole(['admin']),
  validateCambiarSemana,
  configuracionController.cambiarSemanaActual
);

/**
 * @swagger
 * /api/v1/configuracion/habilitar-semana:
 *   post:
 *     summary: Habilitar una semana para reportes
 *     description: Desbloquea automáticamente todos los reportes de esa semana
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semana
 *             properties:
 *               semana:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               periodoId:
 *                 type: string
 *                 format: uuid
 *                 description: Si no se proporciona, se usa el período activo
 *     responses:
 *       200:
 *         description: Semana habilitada exitosamente
 */
router.post(
  '/habilitar-semana',
  authenticate,
  requireRole(['admin']),
  validateSemanaAction,
  configuracionController.habilitarSemana
);

/**
 * @swagger
 * /api/v1/configuracion/deshabilitar-semana:
 *   post:
 *     summary: Deshabilitar una semana para reportes
 *     description: Bloquea automáticamente todos los reportes de esa semana
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semana
 *             properties:
 *               semana:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               periodoId:
 *                 type: string
 *                 format: uuid
 *                 description: Si no se proporciona, se usa el período activo
 *     responses:
 *       200:
 *         description: Semana deshabilitada exitosamente
 */
router.post(
  '/deshabilitar-semana',
  authenticate,
  requireRole(['admin']),
  validateSemanaAction,
  configuracionController.deshabilitarSemana
);

/**
 * @swagger
 * /api/v1/configuracion/bloquear-reportes-semana:
 *   post:
 *     summary: Bloquear masivamente todos los reportes de una semana
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semana
 *             properties:
 *               semana:
 *                 type: integer
 *               periodoAcademico:
 *                 type: string
 *                 description: Si no se proporciona, se usa el período activo
 *     responses:
 *       200:
 *         description: Reportes bloqueados exitosamente
 */
router.post(
  '/bloquear-reportes-semana',
  authenticate,
  requireRole(['admin']),
  configuracionController.bloquearReportesSemana
);

/**
 * @swagger
 * /api/v1/configuracion/desbloquear-reportes-semana:
 *   post:
 *     summary: Desbloquear masivamente todos los reportes de una semana
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semana
 *             properties:
 *               semana:
 *                 type: integer
 *               periodoAcademico:
 *                 type: string
 *                 description: Si no se proporciona, se usa el período activo
 *     responses:
 *       200:
 *         description: Reportes desbloqueados exitosamente
 */
router.post(
  '/desbloquear-reportes-semana',
  authenticate,
  requireRole(['admin']),
  configuracionController.desbloquearReportesSemana
);

// ========================================
// Cambio de Trimestre (Solo Admin)
// ========================================

/**
 * @swagger
 * /api/v1/configuracion/cerrar-periodo:
 *   post:
 *     summary: Cerrar período académico activo
 *     description: Cierra el trimestre actual, actualiza estados de becarios según horas completadas y auto-aprueba reportes pendientes
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmar
 *             properties:
 *               confirmar:
 *                 type: boolean
 *                 example: true
 *                 description: Debe ser true para confirmar el cierre del período
 *     responses:
 *       200:
 *         description: Período cerrado exitosamente
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
 *                   example: Período cerrado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     periodoAcademico:
 *                       type: string
 *                       example: "2025-1"
 *                     fechaCierre:
 *                       type: string
 *                       format: date-time
 *                     becariosActualizados:
 *                       type: integer
 *                       example: 16
 *                     reportesAprobados:
 *                       type: integer
 *                       example: 3
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post(
  '/cerrar-periodo',
  authenticate,
  requireRole(['admin']),
  configuracionController.cerrarPeriodo
);

/**
 * @swagger
 * /api/v1/configuracion/renovar-becario/{id}:
 *   post:
 *     summary: Renovar becario para siguiente trimestre
 *     description: Incrementa trimestres cursados, resetea horas a 0 y reactiva el becario para el período activo
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del becario a renovar
 *     responses:
 *       200:
 *         description: Becario renovado exitosamente
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
 *                   example: Becario renovado exitosamente para el nuevo trimestre
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     trimestresCursados:
 *                       type: integer
 *                       example: 2
 *                     horasCompletadas:
 *                       type: number
 *                       example: 0
 *                     estado:
 *                       type: string
 *                       example: Activa
 *                     periodoInicio:
 *                       type: string
 *                       example: "2025-2"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         description: Becario alcanzó límite de trimestres
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/renovar-becario/:id',
  authenticate,
  requireRole(['admin']),
  validateUuidParam('id'),
  configuracionController.renovarBecario
);

// ========================================
// Rutas de Configuración de Becas
// ========================================

/**
 * @swagger
 * /api/v1/configuracion/becas:
 *   get:
 *     summary: Listar configuraciones de becas
 *     description: Retorna todas las configuraciones de becas con filtros opcionales por tipo y subtipo (endpoint público)
 *     tags: [Configuración]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: tipoBeca
 *         schema:
 *           type: string
 *           enum: [Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente]
 *         description: Filtrar por tipo de beca
 *       - in: query
 *         name: subtipoExcelencia
 *         schema:
 *           type: string
 *           enum: [Académica, Deportiva, Artística, Emprendimiento, Cívico]
 *         description: Filtrar por subtipo de excelencia (solo válido si tipoBeca=Excelencia)
 *     responses:
 *       200:
 *         description: Configuraciones obtenidas exitosamente
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
 *                   example: Configuraciones de becas obtenidas exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 8
 *                     configuraciones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConfiguracionBeca'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get(
  '/becas',
  validateListarConfiguraciones,
  configuracionController.listarConfiguracionesBecas
);

/**
 * @swagger
 * /api/v1/configuracion/becas/documentos:
 *   get:
 *     summary: Obtener documentos requeridos para una beca específica
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipoBeca
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente]
 *       - in: query
 *         name: subtipoExcelencia
 *         schema:
 *           type: string
 *           enum: [Académica, Deportiva, Artística, Emprendimiento, Cívico]
 *         description: Requerido si tipoBeca=Excelencia
 *     responses:
 *       200:
 *         description: Documentos requeridos obtenidos exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/becas/documentos',
  authenticate,
  validateGetDocumentosRequeridos,
  configuracionController.getDocumentosRequeridosBeca
);

/**
 * @swagger
 * /api/v1/configuracion/becas:
 *   put:
 *     summary: Crear o actualizar configuración de beca
 *     description: Realiza un upsert basado en tipoBeca + subtipoExcelencia. Solo administradores.
 *     tags: [Configuración]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipoBeca
 *             properties:
 *               tipoBeca:
 *                 type: string
 *                 enum: [Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente]
 *                 example: "Excelencia"
 *               subtipoExcelencia:
 *                 type: string
 *                 enum: [Académica, Deportiva, Artística, Emprendimiento, Cívico]
 *                 example: "Académica"
 *                 description: Requerido si tipoBeca=Excelencia
 *               montoMensual:
 *                 type: number
 *                 format: decimal
 *                 example: 500.00
 *               cuposDisponibles:
 *                 type: integer
 *                 example: 20
 *               duracionMeses:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 3
 *               promedioMinimo:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 16.00
 *               semestreMinimo:
 *                 type: integer
 *                 example: 2
 *               semestreMaximo:
 *                 type: integer
 *                 example: 10
 *               edadMaxima:
 *                 type: integer
 *                 example: 25
 *               requisitosEspeciales:
 *                 type: string
 *                 example: "Debe presentar certificado de participación en actividades deportivas"
 *               documentosRequeridos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Cédula de identidad", "Certificado de notas", "Carta de motivación"]
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *       201:
 *         description: Configuración creada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put(
  '/becas',
  authenticate,
  requireRole(['admin']),
  validateUpsertConfiguracionBeca,
  configuracionController.upsertConfiguracionBeca
);

module.exports = router;
