const express = require('express');
const usersController = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateUpdateUser,
  validateUpdateRole,
  validateUserFilters
} = require('../validators/usersValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios del sistema
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [estudiante, supervisor, admin]
 *         description: Filtrar por rol
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, apellido o email
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
 *         description: Lista de usuarios obtenida exitosamente
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
 *                   example: Usuarios obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuarios:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Usuario'
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  validateUserFilters,
  usersController.getAllUsers
);

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     summary: Obtener estadísticas de usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     activos:
 *                       type: integer
 *                       example: 145
 *                     inactivos:
 *                       type: integer
 *                       example: 5
 *                     porRole:
 *                       type: object
 *                       example:
 *                         estudiante: 80
 *                         supervisor: 40
 *                         admin: 5
 */
router.get(
  '/stats',
  authenticate,
  requireRole(['admin']),
  usersController.getUserStats
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Usuarios]
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
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/Usuario'
 *                     - type: object
 *                       properties:
 *                         fotocopiaCedulaId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID del documento - Fotocopia de Cédula de Identidad
 *                           example: 123e4567-e89b-12d3-a456-426614174000
 *                         flujogramaCarreraId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID del documento - Flujograma de carrera
 *                           example: 123e4567-e89b-12d3-a456-426614174001
 *                         historicoNotasId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID del documento - Histórico de notas
 *                           example: 123e4567-e89b-12d3-a456-426614174002
 *                         planCarreraAvaladoId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID del documento - Plan de carrera avalado
 *                           example: 123e4567-e89b-12d3-a456-426614174003
 *                         curriculumDeportivoId:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID del documento - Curriculum deportivo
 *                           example: 123e4567-e89b-12d3-a456-426614174004
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, usersController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Actualizar información de un usuario
 *     tags: [Usuarios]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Carlos
 *               apellido:
 *                 type: string
 *                 example: Pérez González
 *               telefono:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *                 example: 04121234567
 *                 description: Número de teléfono (7-20 caracteres, cualquier formato)
 *               carnet:
 *                 type: string
 *                 example: 2021-001234
 *               departamento:
 *                 type: string
 *                 example: Ingeniería
 *               cargo:
 *                 type: string
 *                 example: Profesor
 *               carrera:
 *                 type: string
 *                 example: Ingeniería de Sistemas
 *               trimestre:
 *                 type: integer
 *                 example: 5
 *               iaa:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 15.75
 *                 description: Índice Académico Acumulado (solo estudiantes)
 *               asignaturasAprobadas:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 200
 *                 example: 45
 *                 description: Número de asignaturas aprobadas (solo estudiantes)
 *               fotocopiaCedulaId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del documento - Fotocopia de Cédula de Identidad
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               flujogramaCarreraId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del documento - Flujograma de carrera
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *               historicoNotasId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del documento - Histórico de notas
 *                 example: 123e4567-e89b-12d3-a456-426614174002
 *               planCarreraAvaladoId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del documento - Plan de carrera avalado
 *                 example: 123e4567-e89b-12d3-a456-426614174003
 *               curriculumDeportivoId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID del documento - Curriculum deportivo
 *                 example: 123e4567-e89b-12d3-a456-426614174004
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authenticate, validateUpdateUser, usersController.updateUser);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   put:
 *     summary: Cambiar rol de un usuario (solo admin)
 *     tags: [Usuarios]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [estudiante, supervisor, admin]
 *                 example: supervisor
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put(
  '/:id/role',
  authenticate,
  requireRole(['admin']),
  validateUpdateRole,
  usersController.updateUserRole
);

/**
 * @swagger
 * /api/v1/users/{id}/toggle-status:
 *   patch:
 *     summary: Activar/desactivar un usuario (solo admin)
 *     description: |
 *       **🔄 ENDPOINT DE ACTIVACIÓN/DESACTIVACIÓN CON SINCRONIZACIÓN EN CASCADA**
 *
 *       Permite a los administradores activar o desactivar usuarios del sistema.
 *       Este endpoint ejecuta cambios en cascada cuando el usuario es un **estudiante** con registro en `estudiantes_becarios`.
 *
 *       **✨ Comportamiento en cascada para estudiantes:**
 *
 *       **Al DESACTIVAR usuario (activo = false):**
 *       - Si el estudiante tiene una beca con estado='Activa', automáticamente:
 *         - Cambia `estudiantes_becarios.estado` de 'Activa' → 'Cancelada'
 *         - Registra `motivoSuspension`: "Usuario desactivado administrativamente"
 *       - Si la beca ya está en otro estado (Suspendida, Culminada, Cancelada), no se modifica
 *
 *       **Al REACTIVAR usuario (activo = true):**
 *       - Si el estudiante tiene una beca con estado='Cancelada' Y motivoSuspension='Usuario desactivado administrativamente', automáticamente:
 *         - Cambia `estudiantes_becarios.estado` de 'Cancelada' → 'Activa'
 *         - Limpia el campo `motivoSuspension` (= null)
 *       - Si la beca fue cancelada/suspendida por otro motivo, NO se reactiva automáticamente
 *
 *       **🔐 Consistencia de datos:**
 *       - Usa transacciones para garantizar atomicidad (todo se ejecuta o nada)
 *       - Si falla alguna operación, se revierte todo el cambio
 *
 *       **⚠️ Validaciones:**
 *       - Usuario debe existir en el sistema
 *       - Solo roles 'admin' pueden ejecutar este endpoint
 *
 *       **💡 Casos de uso:**
 *       1. Suspender temporalmente acceso de estudiante con beca activa
 *       2. Reactivar estudiante previamente desactivado (reactiva beca automáticamente)
 *       3. Desactivar supervisores o gestores (no afecta becarios)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario a activar/desactivar
 *         example: '550e8400-e29b-41d4-a716-446655440000'
 *     responses:
 *       200:
 *         description: Estado del usuario cambiado exitosamente (con efecto cascada en beca si aplica)
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
 *                   example: Estado del usuario actualizado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '550e8400-e29b-41d4-a716-446655440000'
 *                     email:
 *                       type: string
 *                       example: 'juan.perez@unimet.edu.ve'
 *                     activo:
 *                       type: boolean
 *                       example: false
 *                       description: Nuevo estado del usuario (true = activo, false = inactivo)
 *             examples:
 *               desactivarEstudiante:
 *                 summary: Desactivar estudiante con beca activa
 *                 description: |
 *                   Usuario estudiante desactivado. Su beca pasó de 'Activa' a 'Cancelada' automáticamente.
 *                 value:
 *                   success: true
 *                   message: Estado del usuario actualizado exitosamente
 *                   data:
 *                     id: '550e8400-e29b-41d4-a716-446655440000'
 *                     email: 'juan.perez@unimet.edu.ve'
 *                     activo: false
 *               reactivarEstudiante:
 *                 summary: Reactivar estudiante previamente desactivado
 *                 description: |
 *                   Usuario estudiante reactivado. Su beca pasó de 'Cancelada' a 'Activa' automáticamente.
 *                 value:
 *                   success: true
 *                   message: Estado del usuario actualizado exitosamente
 *                   data:
 *                     id: '550e8400-e29b-41d4-a716-446655440000'
 *                     email: 'juan.perez@unimet.edu.ve'
 *                     activo: true
 *       400:
 *         description: Error en la transacción o validación
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
 *                   example: Error al actualizar el estado del usuario
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Usuario no encontrado
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
 *                   example: Usuario no encontrado
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  requireRole(['admin']),
  usersController.toggleUserStatus
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Eliminar (desactivar) un usuario (solo admin)
 *     tags: [Usuarios]
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
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  usersController.deleteUser
);

module.exports = router;
