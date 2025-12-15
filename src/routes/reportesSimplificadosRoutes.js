const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const reportesController = require('../controllers/reportesController');
const { validateCreateReporte } = require('../validators/reportesValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reportes de Actividades (Estudiantes)
 *   description: API para que los estudiantes becarios registren sus actividades semanales. Para reportes administrativos use los Reportes Ejecutivos
 */

/**
 * @swagger
 * /api/v1/reportes:
 *   post:
 *     summary: Registrar actividades semanales (Estudiantes becarios)
 *     description: |
 *       Endpoint para que estudiantes becarios registren sus actividades semanales.
 *       El sistema busca automáticamente el registro de beca activo del usuario autenticado.
 *       NOTA: Este endpoint es solo para estudiantes. Los reportes administrativos se encuentran en /api/v1/reportes-ejecutivos
 *     tags: [Reportes de Actividades (Estudiantes)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReporteCreate'
 *           example:
 *             semana: 3
 *             periodoAcademico: "2025-1"
 *             fecha: "2025-10-08"
 *             horasTrabajadas: 10
 *             objetivosPeriodo: "Desarrollar módulo de reportes"
 *             metasEspecificas: "Completar API REST de reportes"
 *             actividadesProgramadas: "Diseño, implementación y pruebas"
 *             actividadesRealizadas: "Completado diseño y 80% de implementación"
 *             descripcionActividades: "Se desarrollaron los endpoints principales"
 *             observaciones: "Trabajo progresa según lo planeado"
 *     responses:
 *       201:
 *         description: Reporte creado exitosamente
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
 *                   example: Reporte creado exitosamente
 *                 data:
 *                   type: object
 *                   description: Reporte creado con todas sus relaciones
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: No se encontró registro de beca activo
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
 *                   example: No se encontró un registro de beca activo para tu usuario
 */
router.post(
  '/',
  authenticate,
  requireRole(['estudiante', 'admin']),
  validateCreateReporte,
  reportesController.createReporteSimplificado
);

/**
 * @swagger
 * /api/v1/reportes/all:
 *   get:
 *     summary: Obtener todos los reportes de todos los estudiantes becarios (Global)
 *     description: |
 *       Endpoint global para administradores, supervisores y capital humano.
 *       Permite obtener TODOS los reportes del sistema con filtros opcionales.
 *       Incluye estadísticas agregadas como cantidad por estado, horas totales y estudiantes únicos.
 *     tags: [Reportes de Actividades (Estudiantes)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodoAcademico
 *         schema:
 *           type: string
 *         description: Filtrar por período académico (ej. "2025-1")
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Aprobada, Rechazada, En Revisión]
 *         description: Filtrar por estado del reporte
 *       - in: query
 *         name: tipoBeca
 *         schema:
 *           type: string
 *           enum: [Ayudantia, Impacto, Excelencia, Exoneracion]
 *         description: Filtrar por tipo de beca
 *       - in: query
 *         name: supervisorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID del supervisor
 *       - in: query
 *         name: estudianteId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID del estudiante
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Cantidad de reportes por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Número de reportes a saltar (para paginación)
 *     responses:
 *       200:
 *         description: Reportes obtenidos exitosamente
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
 *                   example: Reportes globales obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reporte'
 *                     total:
 *                       type: integer
 *                       description: Total de reportes que coinciden con los filtros
 *                       example: 150
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         porEstado:
 *                           type: object
 *                           properties:
 *                             Pendiente:
 *                               type: integer
 *                               example: 25
 *                             Aprobada:
 *                               type: integer
 *                               example: 100
 *                             Rechazada:
 *                               type: integer
 *                               example: 15
 *                             "En Revisión":
 *                               type: integer
 *                               example: 10
 *                         horasTotalesAprobadas:
 *                           type: number
 *                           example: 1250.5
 *                         estudiantesUnicos:
 *                           type: integer
 *                           example: 45
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *       403:
 *         description: No tienes permisos para acceder a este recurso
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
 *                   example: No tienes permisos para ver todos los reportes del sistema
 */
router.get(
  '/all',
  authenticate,
  requireRole(['admin', 'supervisor', 'mentor', 'director-area', 'capital-humano']),
  reportesController.getAllReportesGlobal
);

module.exports = router;
