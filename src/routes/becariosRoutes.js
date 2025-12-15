const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const becariosController = require('../controllers/becariosController');
const postulacionesPlazasController = require('../controllers/postulacionesPlazasController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Becarios
 *   description: Gestión de estudiantes becarios
 */

/**
 * @swagger
 * /api/v1/becarios/me:
 *   get:
 *     summary: Obtener mi información como becario
 *     description: Retorna el registro de beca activo del usuario autenticado
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información de becario obtenida exitosamente
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
 *                   example: Información de becario obtenida exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: ID del registro de estudiante becario
 *                     usuarioId:
 *                       type: string
 *                       format: uuid
 *                     plazaAsignada:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: ID de la plaza asignada (si tiene)
 *                     tipoBeca:
 *                       type: string
 *                       enum: [Ayudantía, Impacto, Excelencia, Exoneración de Pago]
 *                     estado:
 *                       type: string
 *                       enum: [Activa, Suspendida, Culminada, Cancelada]
 *                     periodoInicio:
 *                       type: string
 *                       example: 2025-1
 *                     horasRequeridas:
 *                       type: integer
 *                       example: 120
 *                     horasCompletadas:
 *                       type: number
 *                       example: 45.5
 *                     descuentoAplicado:
 *                       type: number
 *                       example: 25.00
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                         apellido:
 *                           type: string
 *                         email:
 *                           type: string
 *                     plaza:
 *                       type: object
 *                       nullable: true
 *                       description: Plaza asignada con supervisor incluido
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                           example: 'Plaza de Programación I - Laboratorio'
 *                         supervisor:
 *                           type: object
 *                           nullable: true
 *                           description: Supervisor obtenido desde la plaza
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             nombre:
 *                               type: string
 *                             apellido:
 *                               type: string
 *                             email:
 *                               type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me', authenticate, becariosController.getMiBecario);

/**
 * @swagger
 * /api/v1/becarios/me/plazas-compatibles:
 *   get:
 *     summary: Ver plazas disponibles compatibles con mi horario (estudiante)
 *     description: |
 *       Obtiene plazas activas que tienen cupos disponibles y son compatibles con la disponibilidad horaria del estudiante becario autenticado.
 *       Solo muestra plazas donde el horario coincide al menos 10 bloques de 30min o 100% de compatibilidad.
 *     tags: [Becarios]
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
 *         description: Filtrar por período académico (ej. "2025-1")
 *     responses:
 *       200:
 *         description: Plazas compatibles obtenidas exitosamente
 *       400:
 *         description: Estudiante sin disponibilidad horaria registrada
 *       404:
 *         description: No se encontró registro de becario activo
 */
router.get('/me/plazas-compatibles', authenticate, requireRole(['estudiante']), postulacionesPlazasController.getPlazasCompatibles);

/**
 * @swagger
 * /api/v1/becarios/me/postular-plaza:
 *   post:
 *     summary: Postular a una plaza con aprobación administrativa (estudiante)
 *     description: |
 *       Permite a un estudiante becario crear una postulación a una plaza disponible.
 *       La postulación queda en estado "Pendiente" y requiere aprobación de un administrador.
 *       Se valida automáticamente la compatibilidad horaria.
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plazaId
 *             properties:
 *               plazaId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la plaza a la que desea postular
 *     responses:
 *       201:
 *         description: Postulación creada exitosamente
 *       400:
 *         description: Error de validación (ya tiene plaza, ya tiene postulación pendiente, horarios incompatibles, etc.)
 */
router.post('/me/postular-plaza', authenticate, requireRole(['estudiante']), postulacionesPlazasController.postularAPlaza);

/**
 * @swagger
 * /api/v1/becarios/me/postulaciones-plazas:
 *   get:
 *     summary: Ver mis postulaciones a plazas (estudiante)
 *     description: |
 *       Obtiene todas las postulaciones a plazas del estudiante becario autenticado.
 *       Incluye postulaciones pendientes, aprobadas y rechazadas.
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Postulaciones obtenidas exitosamente
 *       404:
 *         description: No se encontró registro de becario activo
 */
router.get('/me/postulaciones-plazas', authenticate, requireRole(['estudiante']), postulacionesPlazasController.getMisPostulaciones);

/**
 * @swagger
 * /api/v1/becarios/postular-plaza:
 *   post:
 *     summary: Postularse a una plaza de ayudantía
 *     description: Permite a un estudiante becario con beca activa postularse a una plaza disponible. La asignación es inmediata si hay cupos disponibles.
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plazaId
 *             properties:
 *               plazaId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la plaza a la que desea postularse
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       201:
 *         description: Postulación a plaza exitosa
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
 *                   example: Postulación a plaza exitosa. Has sido asignado correctamente.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     usuarioId:
 *                       type: string
 *                       format: uuid
 *                     plazaAsignada:
 *                       type: string
 *                       format: uuid
 *                     estado:
 *                       type: string
 *                       example: Activa
 *                     plaza:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                           example: 'Plaza de Programación I - Laboratorio'
 *                         tipoAyudantia:
 *                           type: string
 *                           example: academica
 *                         horasSemana:
 *                           type: integer
 *                           example: 10
 *                         estado:
 *                           type: string
 *                           example: Activa
 *       400:
 *         description: Error de validación
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
 *                   examples:
 *                     yaAsignado:
 *                       value: Ya tienes una plaza asignada. No puedes postularte a otra plaza mientras tengas una asignación activa.
 *                     noDisponible:
 *                       value: Esta plaza ya no tiene cupos disponibles. Todas las plazas están ocupadas.
 *                     inactiva:
 *                       value: Esta plaza no está disponible. Estado actual Inactiva
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Usuario desactivado (no puede postularse)
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
 *                   example: Tu usuario está desactivado. No puedes postularte a plazas en este momento. Contacta al administrador para más información.
 *             examples:
 *               usuarioInactivo:
 *                 summary: Usuario desactivado por administrador
 *                 description: El estudiante tiene beca activa pero su usuario fue desactivado administrativamente
 *                 value:
 *                   success: false
 *                   message: Tu usuario está desactivado. No puedes postularte a plazas en este momento. Contacta al administrador para más información.
 *       404:
 *         description: No se encontró registro de beca o plaza
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
 *                   examples:
 *                     noBeca:
 *                       value: No se encontró un registro de beca activo para este usuario. Debe tener una postulación aprobada antes de postularse a plazas.
 *                     noPlaza:
 *                       value: Plaza no encontrada
 */
router.post(
  '/postular-plaza',
  authenticate,
  requireRole(['estudiante']),
  becariosController.postularPlaza
);

/**
 * @swagger
 * /api/v1/becarios/supervisor/mis-ayudantes:
 *   get:
 *     summary: Obtener mis ayudantes asignados (supervisor)
 *     description: |
 *       Lista los becarios asignados al supervisor autenticado.
 *       Solo muestra estudiantes que tienen plazas asignadas bajo la supervisión del usuario actual.
 *
 *       **🎯 COMPORTAMIENTO POR DEFECTO:**
 *       - **Sin parámetro `estado`**: Muestra solo ayudantes con estado='Activa' (filtro automático)
 *       - **Con `estado=todos`**: Muestra TODOS los estados (útil para ver historial completo)
 *       - **Con `estado=<valor>`**: Filtra por ese estado específico
 *
 *       **💡 Casos de uso:**
 *       - Ver solo ayudantes activos actuales (por defecto): Sin parámetro o `?estado=Activa`
 *       - Ver historial completo incluyendo suspendidos/culminados: `?estado=todos`
 *       - Ver solo ayudantes suspendidos: `?estado=Suspendida`
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Activa, Suspendida, Culminada, Cancelada, todos]
 *         description: |
 *           **Filtrar por estado de la beca**
 *
 *           - **Por defecto** (sin especificar): Muestra solo ayudantes con estado='Activa'
 *           - **`Activa`**: Solo ayudantes activos
 *           - **`Suspendida`**: Solo ayudantes suspendidos
 *           - **`Culminada`**: Solo ayudantes que completaron el programa
 *           - **`Cancelada`**: Solo ayudantes con beca cancelada
 *           - **`todos`**: ⭐ Valor especial que muestra TODOS los estados (historial completo)
 *         example: 'Activa'
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
 *         description: Número de resultados a saltar (paginación)
 *     responses:
 *       200:
 *         description: Ayudantes obtenidos exitosamente
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
 *                   example: Ayudantes obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     ayudantes:
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
 *                           estado:
 *                             type: string
 *                             enum: [Activa, Suspendida, Culminada, Cancelada]
 *                           usuario:
 *                             type: object
 *                             properties:
 *                               nombre:
 *                                 type: string
 *                               apellido:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               carrera:
 *                                 type: string
 *                           plaza:
 *                             type: object
 *                             properties:
 *                               nombre:
 *                                 type: string
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/supervisor/mis-ayudantes',
  authenticate,
  requireRole(['supervisor', 'mentor', 'admin', 'director-area']),
  becariosController.getMisAyudantes
);

/**
 * @swagger
 * /api/v1/becarios:
 *   get:
 *     summary: Listar todos los becarios (admin)
 *     description: |
 *       Lista todos los estudiantes becarios con filtros opcionales.
 *
 *       **🎯 COMPORTAMIENTO POR DEFECTO:**
 *       - **Sin parámetro `estado`**: Muestra solo becarios con estado='Activa' (filtro automático)
 *       - **Con `estado=todos`**: Muestra TODOS los estados (Activa, Suspendida, Culminada, Cancelada)
 *       - **Con `estado=<valor>`**: Filtra por ese estado específico
 *
 *       **Filtros disponibles:**
 *       - `estado`: Filtrar por estado de la beca (ver detalles abajo)
 *       - `tipoBeca`: Filtrar por tipo de beca
 *       - `periodoInicio`: Filtrar por período académico de inicio
 *       - `sinSupervisor`: **⭐ Nuevo** - Filtrar ayudantes sin supervisor asignado
 *
 *       **Casos de uso comunes:**
 *       - Ver solo becarios activos (por defecto): Sin parámetro estado o `?estado=Activa`
 *       - Ver TODOS los becarios independiente del estado: `?estado=todos`
 *       - Ver ayudantes disponibles para asignar: `?sinSupervisor=true&estado=Activa`
 *       - Ver solo becarios suspendidos: `?estado=Suspendida`
 *       - Ver solo becarios culminados: `?estado=Culminada`
 *       - Ver ayudantes de un período específico: `?periodoInicio=2025-1`
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Activa, Suspendida, Culminada, Cancelada, todos]
 *         description: |
 *           **Filtrar por estado de la beca**
 *
 *           - **Por defecto** (sin especificar): Muestra solo becarios con estado='Activa'
 *           - **`Activa`**: Solo becarios activos
 *           - **`Suspendida`**: Solo becarios suspendidos
 *           - **`Culminada`**: Solo becarios que completaron el programa
 *           - **`Cancelada`**: Solo becarios con beca cancelada
 *           - **`todos`**: ⭐ Valor especial que muestra TODOS los estados
 *         example: 'Activa'
 *       - in: query
 *         name: tipoBeca
 *         schema:
 *           type: string
 *           enum: [Ayudantía, Impacto, Excelencia, Exoneración de Pago]
 *         description: Filtrar por tipo de beca
 *       - in: query
 *         name: periodoInicio
 *         schema:
 *           type: string
 *         description: Filtrar por período académico (ej. "2025-1")
 *       - in: query
 *         name: sinSupervisor
 *         schema:
 *           type: boolean
 *           default: false
 *         description: |
 *           **⭐ Filtro para ayudantes sin plaza asignada**
 *
 *           Si es `true`, retorna solo los ayudantes que NO tienen plaza asignada (plazaAsignada = null).
 *           Dado que los supervisores se asignan a través de plazas, un becario sin plaza tampoco tiene supervisor.
 *           Útil para listar ayudantes disponibles para asignación a plazas.
 *
 *           Ejemplo: `?sinSupervisor=true` retorna solo ayudantes sin plaza
 *         example: true
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
 *         description: Número de resultados a saltar (paginación)
 *     responses:
 *       200:
 *         description: Becarios obtenidos exitosamente
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
 *                   example: Becarios obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
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
 *                           plazaAsignada:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                             description: ID de la plaza asignada (null si no tiene plaza)
 *                           tipoBeca:
 *                             type: string
 *                             example: Ayudantía
 *                           estado:
 *                             type: string
 *                             example: Activa
 *                           periodoInicio:
 *                             type: string
 *                             example: 2025-1
 *                           horasRequeridas:
 *                             type: integer
 *                             example: 120
 *                           horasCompletadas:
 *                             type: number
 *                             example: 0
 *                           usuario:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               nombre:
 *                                 type: string
 *                               apellido:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               cedula:
 *                                 type: string
 *                           plaza:
 *                             type: object
 *                             nullable: true
 *                             description: Plaza asignada con supervisor anidado
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               nombre:
 *                                 type: string
 *                               supervisor:
 *                                 type: object
 *                                 nullable: true
 *                                 description: Supervisor obtenido desde la plaza
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     format: uuid
 *                                   nombre:
 *                                     type: string
 *                                   apellido:
 *                                     type: string
 *                                   email:
 *                                     type: string
 *                     total:
 *                       type: integer
 *                       example: 45
 *                       description: Total de becarios que cumplen los filtros
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Error de validación en los parámetros
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
 *                   example: El límite máximo permitido es 100
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  becariosController.getAllBecarios
);

/**
 * @swagger
 * /api/v1/becarios/{id}:
 *   get:
 *     summary: Obtener un becario por ID
 *     tags: [Becarios]
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
 *         description: Becario obtenido exitosamente
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, becariosController.getBecarioById);

/**
 * @swagger
 * /api/v1/becarios/{id}/asignar-plaza:
 *   patch:
 *     summary: Asignar o cambiar plaza de un becario (admin)
 *     description: |
 *       **🎯 ENDPOINT PRINCIPAL PARA ASIGNACIÓN ADMINISTRATIVA DE PLAZAS**
 *
 *       Permite a los administradores asignar becarios a plazas de forma directa, sin requerir que el estudiante se postule.
 *       Este endpoint complementa el flujo de auto-postulación (`POST /becarios/postular-plaza`) con capacidades administrativas.
 *
 *       **✨ Características principales:**
 *       - ✅ Asignación administrativa: Admins asignan plazas directamente a becarios
 *       - ✅ Reasignación automática: Si el becario ya tiene plaza, libera la anterior automáticamente
 *       - ✅ Validación de horarios: Verifica compatibilidad con disponibilidad del estudiante
 *       - ✅ Transacciones seguras: Usa locks para prevenir race conditions
 *       - ✅ Auditoría completa: Registra cambios de plaza en observaciones
 *
 *       **🎯 Casos de uso:**
 *       1. **Asignación inicial**: Asignar plaza a becario nuevo sin supervisor ni plaza
 *       2. **Reasignación**: Cambiar plaza de un becario (libera plaza anterior automáticamente)
 *       3. **Corrección administrativa**: Corregir asignaciones erróneas
 *
 *       **📋 Flujo de la operación:**
 *       1. Valida que el becario existe y está activo
 *       2. Valida que la plaza existe y tiene cupos disponibles
 *       3. Si becario ya tiene plaza asignada:
 *          - Libera plaza anterior (decrementa ocupadas)
 *          - Registra cambio en observaciones
 *       4. Valida compatibilidad de horarios (disponibilidad vs horario de plaza)
 *       5. Asigna nueva plaza
 *       6. Incrementa contador de ocupadas en la plaza
 *       7. Actualiza estado de plaza si se llena
 *
 *       **⚠️ Validaciones:**
 *       - Becario debe existir y estar en estado 'Activa'
 *       - Plaza debe existir y estar disponible (estado 'Activa')
 *       - Plaza debe tener cupos disponibles (ocupadas < capacidad)
 *       - Horario de plaza debe ser compatible con disponibilidad del estudiante
 *       - Si becario no tiene disponibilidad registrada, se rechaza asignación
 *
 *       **💡 Diferencias con auto-postulación:**
 *       - `POST /becarios/postular-plaza`: Estudiantes se postulan ellos mismos
 *       - `PATCH /becarios/:id/asignar-plaza`: Admins asignan cualquier becario a cualquier plaza
 *
 *       **🔐 Permisos requeridos:**
 *       - Solo usuarios con roles: 'admin', 'director-area', 'capital-humano'
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario (UUID)
 *         example: '550e8400-e29b-41d4-a716-446655440000'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plazaId
 *             properties:
 *               plazaId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la plaza a asignar
 *                 example: '987e6543-e21b-98c7-a654-426614174001'
 *           examples:
 *             asignacionNueva:
 *               summary: Asignar plaza a becario sin plaza previa
 *               value:
 *                 plazaId: '987e6543-e21b-98c7-a654-426614174001'
 *             reasignacion:
 *               summary: Cambiar plaza de un becario (libera anterior automáticamente)
 *               value:
 *                 plazaId: '123e4567-e89b-12d3-a456-426614174002'
 *     responses:
 *       200:
 *         description: Plaza asignada exitosamente
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
 *                   example: 'Plaza asignada exitosamente a Juan Carlos Pérez García'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     usuarioId:
 *                       type: string
 *                       format: uuid
 *                     plazaAsignada:
 *                       type: string
 *                       format: uuid
 *                     tipoBeca:
 *                       type: string
 *                       example: 'Ayudantía'
 *                     estado:
 *                       type: string
 *                       example: 'Activa'
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         nombre:
 *                           type: string
 *                         apellido:
 *                           type: string
 *                         email:
 *                           type: string
 *                     plaza:
 *                       type: object
 *                       description: Plaza asignada con supervisor incluido
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombre:
 *                           type: string
 *                           example: 'Plaza de Programación I - Laboratorio'
 *                         tipoAyudantia:
 *                           type: string
 *                           example: 'academica'
 *                         horasSemana:
 *                           type: integer
 *                           example: 10
 *                         estado:
 *                           type: string
 *                           example: 'Activa'
 *                         supervisor:
 *                           type: object
 *                           nullable: true
 *                           description: Supervisor obtenido desde la plaza
 *                           properties:
 *                             nombre:
 *                               type: string
 *                             apellido:
 *                               type: string
 *                             email:
 *                               type: string
 *             examples:
 *               asignacionExitosa:
 *                 summary: Asignación exitosa de plaza
 *                 value:
 *                   success: true
 *                   message: 'Plaza asignada exitosamente a Juan Carlos Pérez García'
 *                   timestamp: '2025-10-20T15:30:00Z'
 *                   data:
 *                     id: '550e8400-e29b-41d4-a716-446655440000'
 *                     usuarioId: '46c39f37-950b-41b2-9177-4d4649e61cc4'
 *                     plazaAsignada: '987e6543-e21b-98c7-a654-426614174001'
 *                     estado: 'Activa'
 *                     usuario:
 *                       nombre: 'Juan Carlos'
 *                       apellido: 'Pérez García'
 *                       email: 'juan.perez@unimet.edu.ve'
 *                     plaza:
 *                       nombre: 'Plaza de Programación I - Laboratorio'
 *               reasignacionExitosa:
 *                 summary: Reasignación exitosa (cambio de plaza)
 *                 value:
 *                   success: true
 *                   message: 'Plaza reasignada exitosamente. Plaza anterior: Cálculo I → Nueva plaza: Programación I'
 *                   timestamp: '2025-10-20T15:30:00Z'
 *                   data:
 *                     id: '550e8400-e29b-41d4-a716-446655440000'
 *                     plazaAsignada: '123e4567-e89b-12d3-a456-426614174002'
 *                     observaciones: 'Plaza reasignada por admin desde Cálculo I a Programación I'
 *       400:
 *         description: Error de validación
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
 *                 error:
 *                   type: string
 *             examples:
 *               plazaIdRequerido:
 *                 summary: Campo plazaId faltante
 *                 value:
 *                   success: false
 *                   message: 'El ID de la plaza es requerido'
 *                   error: 'Bad Request'
 *               uuidInvalido:
 *                 summary: Formato UUID inválido
 *                 value:
 *                   success: false
 *                   message: 'El plazaId debe ser un UUID válido'
 *                   error: 'Bad Request'
 *               horariosIncompatibles:
 *                 summary: Horarios no compatibles
 *                 value:
 *                   success: false
 *                   message: 'El horario de la plaza no es compatible con la disponibilidad del estudiante'
 *                   error: 'Bad Request'
 *                   detalles:
 *                     bloquesSinDisponibilidad:
 *                       - dia: 'Lunes'
 *                         horaInicio: '08:00'
 *                         horaFin: '10:00'
 *                     reporte: 'Lunes 08:00-10:00'
 *               sinDisponibilidad:
 *                 summary: Estudiante sin disponibilidad registrada
 *                 value:
 *                   success: false
 *                   message: 'El estudiante no ha registrado su disponibilidad horaria'
 *                   error: 'Bad Request'
 *               plazaCompleta:
 *                 summary: Plaza sin cupos disponibles
 *                 value:
 *                   success: false
 *                   message: 'Esta plaza ya no tiene cupos disponibles. Todas las plazas están ocupadas.'
 *                   error: 'Bad Request'
 *               plazaInactiva:
 *                 summary: Plaza no disponible
 *                 value:
 *                   success: false
 *                   message: 'Esta plaza no está disponible. Estado actual: Inactiva'
 *                   error: 'Bad Request'
 *               becarioInactivo:
 *                 summary: Becario no activo
 *                 value:
 *                   success: false
 *                   message: 'No se puede asignar plaza a un becario con estado Suspendida'
 *                   error: 'Bad Request'
 *               usuarioInactivo:
 *                 summary: Usuario desactivado administrativamente
 *                 description: El becario tiene estado='Activa' pero el usuario fue desactivado por el administrador
 *                 value:
 *                   success: false
 *                   message: 'No se puede asignar plaza a un usuario desactivado. El usuario Juan Carlos Pérez está inactivo.'
 *                   error: 'Bad Request'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Acceso denegado - Solo administradores
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
 *                   example: 'Acceso denegado'
 *                 error:
 *                   type: string
 *                   example: 'No tienes permisos para realizar esta acción. Solo administradores pueden asignar plazas.'
 *       404:
 *         description: Becario o plaza no encontrado
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
 *                 error:
 *                   type: string
 *                   example: 'Not Found'
 *             examples:
 *               becarioNoEncontrado:
 *                 summary: Estudiante becario no existe
 *                 value:
 *                   success: false
 *                   message: 'Estudiante becario no encontrado'
 *                   error: 'Not Found'
 *               plazaNoEncontrada:
 *                 summary: Plaza no existe
 *                 value:
 *                   success: false
 *                   message: 'Plaza no encontrada'
 *                   error: 'Not Found'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  '/:id/asignar-plaza',
  authenticate,
  requireRole(['admin']),
  becariosController.asignarPlazaAdmin
);

/**
 * @swagger
 * /api/v1/becarios/{id}/remover-plaza:
 *   put:
 *     summary: Remover la asignación de plaza de un becario (admin)
 *     description: |
 *       **🔄 ENDPOINT PARA REMOVER ASIGNACIÓN DE PLAZA**
 *
 *       Permite a los administradores remover la plaza asignada a un becario, liberando el cupo en la plaza.
 *       Esta operación complementa el sistema de asignación de plazas.
 *
 *       **✨ Características principales:**
 *       - ✅ Remoción segura: Libera el cupo en la plaza automáticamente
 *       - ✅ Transacciones seguras: Usa locks para prevenir race conditions
 *       - ✅ Auditoría completa: Registra la remoción en observaciones del becario
 *       - ✅ Validaciones robustas: Verifica que el becario tenga plaza antes de remover
 *
 *       **🎯 Casos de uso:**
 *       1. **Liberar estudiante**: Quitar plaza a becario que ya no la necesita
 *       2. **Preparar reasignación**: Liberar plaza antes de asignar una nueva
 *       3. **Corrección administrativa**: Corregir asignaciones erróneas
 *
 *       **📋 Flujo de la operación:**
 *       1. Valida que el becario existe
 *       2. Verifica que el becario tiene plaza asignada
 *       3. Obtiene información de la plaza para auditoría
 *       4. Libera el cupo en la plaza (decrementa ocupadas)
 *       5. Remueve la asignación (plazaAsignada = null)
 *       6. Registra la operación en observaciones con fecha y detalles
 *
 *       **⚠️ Validaciones:**
 *       - Becario debe existir
 *       - Becario debe tener plaza asignada (no se puede remover null)
 *       - Plaza debe existir (si fue eliminada, se remueve la referencia de todos modos)
 *
 *       **💡 Diferencia con cancelación:**
 *       - `DELETE /becarios/:id`: Cancela la beca completa (estado = Cancelada)
 *       - `PUT /becarios/:id/remover-plaza`: Solo remueve la plaza, beca sigue activa
 *
 *       **🔐 Permisos requeridos:**
 *       - Solo usuarios con roles: 'admin', 'director-area', 'capital-humano'
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario (UUID)
 *         example: '550e8400-e29b-41d4-a716-446655440000'
 *     responses:
 *       200:
 *         description: Plaza removida exitosamente
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
 *                   example: 'Plaza removida exitosamente. El becario Juan Carlos Pérez García ya no está asignado a ninguna plaza.'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     usuarioId:
 *                       type: string
 *                       format: uuid
 *                     plazaAsignada:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                       description: Será null después de remover la plaza
 *                     tipoBeca:
 *                       type: string
 *                       example: 'Ayudantía'
 *                     estado:
 *                       type: string
 *                       example: 'Activa'
 *                     observaciones:
 *                       type: string
 *                       example: 'Plaza removida por admin: Programación I (CI-2125) el 2025-10-28T15:30:00.000Z'
 *                       description: Incluye registro de la remoción con fecha y plaza removida
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         nombre:
 *                           type: string
 *                         apellido:
 *                           type: string
 *                         email:
 *                           type: string
 *                     plaza:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                       description: Será null después de remover
 *             examples:
 *               removerPlazaExitosa:
 *                 summary: Remoción exitosa de plaza
 *                 value:
 *                   success: true
 *                   message: 'Plaza removida exitosamente. El becario Juan Carlos Pérez García ya no está asignado a ninguna plaza.'
 *                   timestamp: '2025-10-28T15:30:00Z'
 *                   data:
 *                     id: '550e8400-e29b-41d4-a716-446655440000'
 *                     usuarioId: '46c39f37-950b-41b2-9177-4d4649e61cc4'
 *                     plazaAsignada: null
 *                     estado: 'Activa'
 *                     observaciones: 'Plaza removida por admin: Programación I (CI-2125) el 2025-10-28T15:30:00.000Z'
 *                     usuario:
 *                       nombre: 'Juan Carlos'
 *                       apellido: 'Pérez García'
 *                       email: 'juan.perez@unimet.edu.ve'
 *                     plaza: null
 *       400:
 *         description: Error de validación
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
 *                 error:
 *                   type: string
 *             examples:
 *               uuidInvalido:
 *                 summary: Formato UUID inválido
 *                 value:
 *                   success: false
 *                   message: 'El ID del becario debe ser un UUID válido'
 *                   error: 'Bad Request'
 *               sinPlaza:
 *                 summary: Becario sin plaza asignada
 *                 value:
 *                   success: false
 *                   message: 'Este becario no tiene plaza asignada. No hay nada que remover.'
 *                   error: 'Bad Request'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Acceso denegado - Solo administradores
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
 *                   example: 'Acceso denegado'
 *                 error:
 *                   type: string
 *                   example: 'No tienes permisos para realizar esta acción. Solo administradores pueden remover plazas.'
 *       404:
 *         description: Becario no encontrado
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
 *                   example: 'Estudiante becario no encontrado'
 *                 error:
 *                   type: string
 *                   example: 'Not Found'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/:id/remover-plaza',
  authenticate,
  requireRole(['admin']),
  becariosController.removerPlaza
);

/**
 * @swagger
 * /api/v1/becarios/{id}:
 *   patch:
 *     summary: Actualizar información de un becario (admin)
 *     description: |
 *       Actualiza campos específicos de un estudiante becario. Permite actualizar estado, horas, evaluaciones, etc.
 *
 *       **Validaciones de transición de estado:**
 *       - Desde 'Activa': puede cambiar a Suspendida, Culminada, Cancelada
 *       - Desde 'Suspendida': puede cambiar a Activa, Cancelada
 *       - Desde 'Culminada': no se permite cambio de estado
 *       - Desde 'Cancelada': no se permite cambio de estado
 *
 *       **Campos actualizables:**
 *       - estado: Cambiar estado del becario (con validaciones)
 *       - horasCompletadas: Actualizar horas completadas (solo Ayudantía)
 *       - iaaActual: Actualizar índice académico actual
 *       - observaciones: Agregar notas administrativas
 *       - motivoSuspension: Motivo de suspensión/cancelación
 *       - descuentoAplicado: Porcentaje de descuento
 *       - evaluacionSatisfactoria: Resultado de evaluación
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [Activa, Suspendida, Culminada, Cancelada]
 *                 description: Nuevo estado del becario
 *               horasCompletadas:
 *                 type: number
 *                 minimum: 0
 *                 description: Horas completadas (solo para Beca Ayudantía)
 *                 example: 45.5
 *               iaaActual:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 20
 *                 description: Índice académico actual
 *                 example: 14.5
 *               observaciones:
 *                 type: string
 *                 description: Observaciones administrativas
 *               motivoSuspension:
 *                 type: string
 *                 description: Motivo de suspensión o cancelación (requerido al cambiar a estos estados)
 *               descuentoAplicado:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Porcentaje de descuento aplicado
 *                 example: 25.00
 *               evaluacionSatisfactoria:
 *                 type: boolean
 *                 description: Resultado de la evaluación (true = satisfactoria)
 *           examples:
 *             suspenderBecario:
 *               summary: Suspender un becario
 *               value:
 *                 estado: Suspendida
 *                 motivoSuspension: Bajo rendimiento académico
 *             actualizarHoras:
 *               summary: Actualizar horas completadas
 *               value:
 *                 horasCompletadas: 75.5
 *             registrarEvaluacion:
 *               summary: Registrar evaluación satisfactoria
 *               value:
 *                 evaluacionSatisfactoria: true
 *                 descuentoAplicado: 25.00
 *             culminarBeca:
 *               summary: Culminar una beca
 *               value:
 *                 estado: Culminada
 *     responses:
 *       200:
 *         description: Becario actualizado exitosamente
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
 *                   example: Becario actualizado exitosamente
 *                 data:
 *                   type: object
 *                   description: Becario actualizado con todas las relaciones
 *       400:
 *         description: Error de validación
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
 *                   examples:
 *                     transicionInvalida:
 *                       value: "No se puede cambiar de estado 'Culminada' a 'Activa'"
 *                     motivoRequerido:
 *                       value: El motivo de suspensión es requerido al suspender un becario
 *                     horasExcedidas:
 *                       value: "Las horas completadas (150) no pueden exceder las horas requeridas (120)"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  authenticate,
  requireRole(['admin']),
  becariosController.updateBecario
);

/**
 * @swagger
 * /api/v1/becarios/{id}:
 *   delete:
 *     summary: Cancelar un becario (borrado lógico - admin)
 *     description: |
 *       Cancela un estudiante becario cambiando su estado a 'Cancelada'.
 *       Esta es una operación de borrado lógico que no elimina físicamente el registro.
 *
 *       **Características:**
 *       - Cambio de estado a 'Cancelada'
 *       - Registro de motivo de cancelación
 *       - Auditoría completa de la operación
 *       - El registro permanece en la base de datos para histórico
 *
 *       **Efectos:**
 *       - El becario no podrá registrar más horas
 *       - Se registra la fecha de culminación
 *       - Se mantiene el histórico completo
 *     tags: [Becarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del estudiante becario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - motivo
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo de la cancelación (requerido)
 *                 example: Incumplimiento de horas requeridas
 *           examples:
 *             incumplimiento:
 *               summary: Cancelación por incumplimiento
 *               value:
 *                 motivo: Incumplimiento reiterado de horarios establecidos
 *             solicitudEstudiante:
 *               summary: Cancelación a solicitud del estudiante
 *               value:
 *                 motivo: Solicitud del estudiante por cambio de carrera
 *     responses:
 *       200:
 *         description: Becario cancelado exitosamente
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
 *                   example: Becario cancelado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     estado:
 *                       type: string
 *                       example: Cancelada
 *                     motivoSuspension:
 *                       type: string
 *                       example: Incumplimiento de horas requeridas
 *                     fechaCulminacion:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Error de validación
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
 *                   example: El motivo de cancelación es requerido
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  becariosController.deleteBecario
);

module.exports = router;
