const express = require('express');
const postulacionesController = require('../controllers/postulacionesController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateCreatePostulacion,
  validateUpdatePostulacion,
  validateEvaluacion,
  validateVerificarEmail
} = require('../validators/postulacionesValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Postulaciones
 *   description: Gestión de postulaciones a programas de becas
 */

/**
 * @swagger
 * /api/v1/postulaciones/registro-directo:
 *   post:
 *     summary: Registrar becario directamente (solo administradores)
 *     tags: [Postulaciones]
 *     description: |
 *       Endpoint exclusivo para administradores que permite registrar becarios directamente sin pasar por el proceso de postulación regular.
 *
 *       **Proceso automatizado:**
 *       - Crea la postulación en estado "Aprobada"
 *       - Crea usuario si no existe (con contraseña temporal)
 *       - Crea registro de EstudianteBecario activo
 *       - Envía email con credenciales de acceso
 *
 *       **Casos de uso:**
 *       - Becas sin proceso de postulación formal
 *       - Registros manuales por casos especiales
 *       - Estudiantes que no pueden postular por sí mismos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - cedula
 *               - email
 *               - telefono
 *               - fechaNacimiento
 *               - estadoCivil
 *               - tipoPostulante
 *               - carrera
 *               - iaa
 *               - asignaturasAprobadas
 *               - creditosInscritos
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Juan Carlos Pérez
 *               cedula:
 *                 type: string
 *                 pattern: ^[VE]-\\d{7,8}$
 *                 example: V-12345678
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@unimet.edu.ve
 *               telefono:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *                 example: 04121234567
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: 2002-05-15
 *               estadoCivil:
 *                 type: string
 *                 enum: [soltero, casado, divorciado, viudo, union-estable]
 *                 example: soltero
 *               tipoPostulante:
 *                 type: string
 *                 enum: [estudiante-pregrado, estudiante-postgrado, estudiante-nuevo]
 *                 example: estudiante-pregrado
 *               carrera:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Ingeniería de Sistemas
 *               trimestre:
 *                 type: string
 *                 example: 2025-1
 *                 description: Periodo de la beca (formato YYYY-X)
 *               iaa:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 15.5
 *                 description: IAA mínimo 12 (pregrado) o 14 (postgrado)
 *               promedioBachillerato:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 18.5
 *                 description: Requerido solo si tipoPostulante = estudiante-nuevo
 *               asignaturasAprobadas:
 *                 type: integer
 *                 minimum: 0
 *                 example: 25
 *               creditosInscritos:
 *                 type: integer
 *                 minimum: 3
 *                 maximum: 30
 *                 example: 12
 *               tipoBeca:
 *                 type: string
 *                 enum: [Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente]
 *                 default: Ayudantía
 *                 example: Excelencia
 *               documentos:
 *                 type: array
 *                 description: Documentos de soporte (opcional)
 *                 items:
 *                   type: object
 *                   required:
 *                     - tipo
 *                     - nombre
 *                   properties:
 *                     tipo:
 *                       type: string
 *                       example: cedula
 *                     nombre:
 *                       type: string
 *                       example: cedula_12345678.pdf
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: https://example.com/docs/cedula.pdf
 *                     path:
 *                       type: string
 *                       example: /uploads/documentos/cedula_12345678.pdf
 *     responses:
 *       201:
 *         description: Becario registrado exitosamente
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
 *                     postulacion:
 *                       type: object
 *                       description: Postulación creada en estado Aprobada
 *                     usuario:
 *                       type: object
 *                       description: Usuario creado o existente
 *                     estudianteBecario:
 *                       type: object
 *                       description: Registro de becario activo
 *                 message:
 *                   type: string
 *                   example: Becario registrado exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/registro-directo', authenticate, requireRole(['admin']), validateCreatePostulacion, postulacionesController.registroDirectoBecario);

/**
 * @swagger
 * /api/v1/postulaciones:
 *   post:
 *     summary: Crear una nueva postulación (ruta pública)
 *     tags: [Postulaciones]
 *     description: Endpoint público para que estudiantes puedan postular sin tener cuenta. La validación de duplicados se realiza por cédula.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - cedula
 *               - email
 *               - telefono
 *               - fechaNacimiento
 *               - estadoCivil
 *               - tipoPostulante
 *               - carrera
 *               - iaa
 *               - asignaturasAprobadas
 *               - creditosInscritos
 *             description: |
 *               Campos opcionales: trimestre, promedioBachillerato (requerido solo para estudiantes-nuevo), documentos
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Juan Carlos
 *               cedula:
 *                 type: string
 *                 pattern: ^[VE]-\d{7,8}$
 *                 example: V-12345678
 *                 description: Cédula venezolana (V-) o extranjera (E-)
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@unimet.edu.ve
 *               telefono:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *                 example: 04121234567
 *                 description: Número de teléfono (7-20 caracteres, cualquier formato)
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: 2002-05-15
 *               estadoCivil:
 *                 type: string
 *                 enum: [soltero, casado, divorciado, viudo, union-estable]
 *                 example: soltero
 *               tipoPostulante:
 *                 type: string
 *                 enum: [estudiante-pregrado, estudiante-postgrado, estudiante-nuevo]
 *                 example: estudiante-pregrado
 *               carrera:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Ingeniería de Sistemas
 *               trimestre:
 *                 type: string
 *                 example: 2025-1
 *                 description: "[OPCIONAL] Trimestre de postulación (formato: YYYY-X). Para estudiantes que aún no estén activos"
 *               iaa:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 15.5
 *                 description: IAA mínimo 12 para pregrado, 14 para postgrado
 *               promedioBachillerato:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 18.5
 *                 description: "[OPCIONAL] Promedio de bachillerato (requerido SOLO si tipoPostulante = 'estudiante-nuevo')"
 *               asignaturasAprobadas:
 *                 type: integer
 *                 minimum: 0
 *                 example: 25
 *               creditosInscritos:
 *                 type: integer
 *                 minimum: 3
 *                 maximum: 30
 *                 example: 12
 *               tipoBeca:
 *                 type: string
 *                 enum: [Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente]
 *                 default: Ayudantía
 *                 example: Ayudantía
 *               documentos:
 *                 type: array
 *                 description: Documentos de soporte (opcional al crear)
 *                 items:
 *                   type: object
 *                   required:
 *                     - tipo
 *                     - nombre
 *                   properties:
 *                     tipo:
 *                       type: string
 *                       example: cedula
 *                     nombre:
 *                       type: string
 *                       example: cedula_12345678.pdf
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: https://example.com/docs/cedula.pdf
 *                     path:
 *                       type: string
 *                       example: /uploads/documentos/cedula_12345678.pdf
 *     responses:
 *       201:
 *         description: Postulación creada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/', validateCreatePostulacion, postulacionesController.createPostulacion);

/**
 * @swagger
 * /api/v1/postulaciones:
 *   get:
 *     summary: Listar postulaciones (con filtros opcionales)
 *     tags: [Postulaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, En Revisión, Aprobada, Rechazada]
 *         description: Filtrar por estado de la postulación
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *           enum: [Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente]
 *         description: Filtrar por tipo de beca
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-(1|2|3)$
 *           example: 2025-1
 *         description: Filtrar por período académico (formato YYYY-X)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número máximo de resultados por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de resultados a saltar para paginación
 *     responses:
 *       200:
 *         description: Lista de postulaciones obtenida exitosamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authenticate, postulacionesController.getAllPostulaciones);

/**
 * @swagger
 * /api/v1/postulaciones/stats:
 *   get:
 *     summary: Obtener estadísticas de postulaciones
 *     tags: [Postulaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *           pattern: ^\d{4}-(1|2|3)$
 *           example: 2025-1
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/stats', authenticate, requireRole(['admin']), postulacionesController.getPostulacionesStats);

/**
 * @swagger
 * /api/v1/postulaciones/verificar:
 *   get:
 *     summary: Verificar postulaciones por email (endpoint público)
 *     tags: [Postulaciones]
 *     description: |
 *       Endpoint público (sin autenticación) que permite verificar si un email tiene postulaciones registradas.
 *
 *       **Características:**
 *       - No requiere autenticación
 *       - Retorna todas las postulaciones asociadas al email
 *       - Solo muestra campos públicos (sin datos sensibles)
 *       - Útil para validaciones en frontend antes de postular
 *     security: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email a verificar
 *         example: juan.perez@unimet.edu.ve
 *     responses:
 *       200:
 *         description: Postulaciones encontradas
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
 *                   example: Postulaciones encontradas
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: 123e4567-e89b-12d3-a456-426614174000
 *                       estado:
 *                         type: string
 *                         enum: [Pendiente, En Revisión, Aprobada, Rechazada]
 *                         example: Pendiente
 *                       fechaPostulacion:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-01-15T10:30:00.000Z
 *                       tipoBeca:
 *                         type: string
 *                         example: Ayudantía
 *                       nombre:
 *                         type: string
 *                         example: Juan
 *                       carrera:
 *                         type: string
 *                         example: Ingeniería de Sistemas
 *                       trimestre:
 *                         type: string
 *                         example: 2025-1
 *       404:
 *         description: No se encontraron postulaciones con ese email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No se encontraron postulaciones con ese email
 *       400:
 *         description: Email inválido o faltante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Datos de entrada inválidos
 */
router.get('/verificar', validateVerificarEmail, postulacionesController.verificarPostulacionPorEmail);

/**
 * @swagger
 * /api/v1/postulaciones/{id}:
 *   get:
 *     summary: Obtener una postulación específica
 *     tags: [Postulaciones]
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
 *         description: Postulación obtenida exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, postulacionesController.getPostulacionById);

/**
 * @swagger
 * /api/v1/postulaciones/{id}:
 *   put:
 *     summary: Actualizar una postulación (solo si está pendiente)
 *     tags: [Postulaciones]
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
 *             minProperties: 1
 *             properties:
 *               nombre:
 *                 type: string
 *               cedula:
 *                 type: string
 *                 pattern: ^[VE]-\d{7,8}$
 *                 description: Cédula venezolana (V-) o extranjera (E-)
 *               email:
 *                 type: string
 *                 format: email
 *               telefono:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *               estadoCivil:
 *                 type: string
 *                 enum: [soltero, casado, divorciado, viudo, union-estable]
 *               tipoPostulante:
 *                 type: string
 *                 enum: [estudiante-pregrado, estudiante-postgrado, estudiante-nuevo]
 *               carrera:
 *                 type: string
 *               trimestre:
 *                 type: string
 *               iaa:
 *                 type: number
 *               promedioBachillerato:
 *                 type: number
 *               asignaturasAprobadas:
 *                 type: integer
 *               creditosInscritos:
 *                 type: integer
 *               tipoBeca:
 *                 type: string
 *                 enum: [Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente]
 *               documentos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     tipo:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     url:
 *                       type: string
 *                     path:
 *                       type: string
 *     responses:
 *       200:
 *         description: Postulación actualizada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authenticate, validateUpdatePostulacion, postulacionesController.updatePostulacion);

/**
 * @swagger
 * /api/v1/postulaciones/{id}/aprobar:
 *   put:
 *     summary: Aprobar una postulación (solo gestores)
 *     tags: [Postulaciones]
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
 *             required:
 *               - observaciones
 *             properties:
 *               observaciones:
 *                 type: string
 *                 example: Cumple todos los requisitos
 *     responses:
 *       200:
 *         description: Postulación aprobada exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/:id/aprobar', authenticate, requireRole(['admin']), validateEvaluacion, postulacionesController.aprobarPostulacion);

/**
 * @swagger
 * /api/v1/postulaciones/{id}/rechazar:
 *   put:
 *     summary: Rechazar una postulación (solo gestores)
 *     tags: [Postulaciones]
 *     description: |
 *       Rechaza una postulación y envía un email de notificación al estudiante con las observaciones del administrador.
 *       **IMPORTANTE**: Si el envío del email falla, la operación completa se revierte (rollback).
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
 *             required:
 *               - observaciones
 *             properties:
 *               observaciones:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 2000
 *                 description: Motivo del rechazo que será enviado al estudiante por email (mínimo 20, máximo 2000 caracteres)
 *                 example: No cumple requisito mínimo de IAA. Se requiere un IAA de al menos 12 puntos para estudiantes de pregrado.
 *     responses:
 *       200:
 *         description: Postulación rechazada exitosamente y email enviado al estudiante
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Error al enviar el email de notificación (se revierte el rechazo)
 */
router.put('/:id/rechazar', authenticate, requireRole(['admin']), validateEvaluacion, postulacionesController.rechazarPostulacion);

/**
 * @swagger
 * /api/v1/postulaciones/{id}/cancelar:
 *   put:
 *     summary: Cancelar una postulación
 *     tags: [Postulaciones]
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
 *         description: Postulación cancelada exitosamente
 */
router.put('/:id/cancelar', authenticate, postulacionesController.cancelarPostulacion);

module.exports = router;