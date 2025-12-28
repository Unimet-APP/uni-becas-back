const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const {
  validateLogin,
  validateRegister,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateEmailByRole,
  validateConvertirEstudiante
} = require('../validators/authValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para autenticación y gestión de usuarios
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@unimet.edu.ve
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Student123!
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: Inicio de sesión exitoso
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/Usuario'
 *                     tokens:
 *                       $ref: '#/components/schemas/Tokens'
 */
router.post('/login', validateLogin, authController.login);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     description: |
 *       Registra un nuevo usuario en el sistema.
 *
 *       **Requisitos de email según el rol:**
 *       - `estudiante`: Requiere email institucional (@unimet.edu.ve o @correo.unimet.edu.ve)
 *       - `supervisor`, `admin`, `director-area`, `capital-humano`, `supervisor-laboral`, `mentor`: Aceptan cualquier dominio de email válido
 *
 *       **Campos opcionales según rol:**
 *       - **Supervisores/Staff**: `departamento`, `cargo`
 *       - **Estudiantes**: `carrera`, `trimestre`, `carnet`
 *       - **Todos**: `telefono`, `carnet`
 *
 *       Todos los campos role-específicos son opcionales durante el registro y pueden actualizarse posteriormente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *           examples:
 *             registroEstudiante:
 *               summary: Registro de estudiante
 *               value:
 *                 email: juan.perez@correo.unimet.edu.ve
 *                 password: Student123!
 *                 nombre: Juan Carlos
 *                 apellido: Pérez González
 *                 cedula: V-12345678
 *                 telefono: +58 212 1234567
 *                 carnet: 2021-001234
 *                 role: estudiante
 *                 carrera: Ingeniería de Sistemas
 *                 trimestre: 5
 *             registroSupervisor:
 *               summary: Registro de supervisor
 *               value:
 *                 email: pedro.sanchez@unimet.edu.ve
 *                 password: Supervisor123!
 *                 nombre: Pedro
 *                 apellido: Sanchez
 *                 cedula: V-27783432
 *                 telefono: +58 212 1234567
 *                 role: supervisor
 *                 departamento: Ciencias
 *                 cargo: Profesor Asociado
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Conflicto - Usuario ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', validateRegister, validateEmailByRole, authController.register);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     tags: [Autenticación]
 *     description: Permite solicitar el restablecimiento de contraseña para cualquier email registrado en el sistema, sin restricción de dominio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email registrado en el sistema (cualquier dominio válido)
 *                 example: usuario@example.com
 */
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - nuevaPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123def456
 *               nuevaPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NuevaPassword123!
 */
router.post('/reset-password', validateResetPassword, authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Cambiar contraseña (usuario autenticado)
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordActual
 *               - nuevaPassword
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 example: PasswordActual123!
 *               nuevaPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NuevaPassword123!
 */
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
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
 */
router.put('/profile', authenticate, validateUpdateProfile, authController.updateProfile);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Obtener usuario actual con permisos
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario actual obtenido exitosamente
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['read:own:postulaciones', 'create:own:postulaciones']
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/verify-token:
 *   post:
 *     summary: Verificar validez del token
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         nombre:
 *                           type: string
 */
router.post('/verify-token', authenticate, authController.verifyToken);

/**
 * @swagger
 * /api/v1/auth/approve/{id}:
 *   patch:
 *     summary: Aprobar un usuario registrado
 *     tags: [Autenticación]
 *     description: Permite a un administrador aprobar un usuario que se registró en el sistema. El usuario aprobado recibirá un correo de notificación y podrá iniciar sesión.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del usuario a aprobar
 *         example: f7b6f375-777a-405b-b8e6-038275869571
 *     responses:
 *       200:
 *         description: Usuario aprobado exitosamente
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
 *                   example: Usuario aprobado exitosamente. Se ha enviado un correo de notificación.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     role:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                       example: true
 *                     activo:
 *                       type: boolean
 *       400:
 *         description: Usuario ya aprobado
 *       403:
 *         description: Acceso denegado - Se requiere rol de administrador
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/approve/:id', authenticate, requireAdmin, authController.approveUser);

   /**
    * @swagger
    * /api/v1/auth/convertir-estudiante:
    *   post:
    *     summary: Convertir aspirante a estudiante
    *     tags: [Autenticación]
    *     description: |
    *       Permite a un aspirante (estudiante de bachillerato) convertirse en estudiante universitario
    *       cuando ingresa a la UNIMET. Requiere proporcionar un email institucional de estudiante (@correo.unimet.edu.ve).
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - emailUnimet
    *             properties:
    *               emailUnimet:
    *                 type: string
    *                 format: email
    *                 description: Email institucional de estudiante (@correo.unimet.edu.ve)
    *                 example: maria.garcia@correo.unimet.edu.ve
    *               carrera:
    *                 type: string
    *                 example: Ingeniería de Sistemas
    *               trimestre:
    *                 type: integer
    *                 minimum: 1
    *                 maximum: 15
    *                 example: 1
    *     responses:
    *       200:
    *         description: Aspirante convertido a estudiante exitosamente
    *       400:
    *         description: Error de validación
    *       403:
    *         description: Solo los aspirantes pueden usar este endpoint
    */
   router.post(
     '/convertir-estudiante',
     authenticate,
     validateConvertirEstudiante,
     authController.convertirAspiranteAEstudiante
   );


module.exports = router;