const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: KPIs y métricas del dashboard administrativo
 */

/**
 * @swagger
 * /api/v1/dashboard/kpis:
 *   get:
 *     summary: Obtener todos los KPIs del dashboard administrativo
 *     description: |
 *       **📊 ENDPOINT PRINCIPAL DE DASHBOARD CON KPIs**
 *
 *       Retorna indicadores clave de rendimiento (KPIs) del sistema de becas, organizados por categorías.
 *       Este endpoint está diseñado para alimentar tarjetas tipo KPI en el frontend (dashboard).
 *
 *       **✨ KPIs incluidos (10 totales):**
 *
 *       **Becarios (3 KPIs):**
 *       - Total de estudiantes becarios (estados: Activa, Suspendida, Culminada)
 *       - Número de becarios por tipo de beca (solo Activa) - 5 tipos
 *       - Becarios ayudantes sin plaza asignada
 *
 *       **Plazas (3 KPIs):**
 *       - Número de plazas activas
 *       - Número de plazas inactivas
 *       - Número de plazas con capacidad disponible
 *
 *       **Usuarios (2 KPIs):**
 *       - Total de usuarios registrados en el sistema
 *       - Total de supervisores activos
 *
 *       **Operaciones (2 KPIs):**
 *       - Postulaciones pendientes de evaluación
 *       - Reportes de actividad pendientes de aprobación
 *
 *       **🎯 Filtro opcional por período:**
 *       - Sin parámetro: Datos de todos los períodos académicos
 *       - Con `?periodo=2025-1`: Datos filtrados por período específico
 *
 *       **💡 Casos de uso:**
 *       - Dashboard general: `GET /api/v1/dashboard/kpis`
 *       - Dashboard de período específico: `GET /api/v1/dashboard/kpis?periodo=2025-1`
 *
 *       **🔐 Permisos requeridos:**
 *       - Solo usuarios con roles: 'admin', 'gestor_becas'
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-[1-3]$'
 *         description: |
 *           **Filtro opcional de período académico**
 *
 *           Formato: `YYYY-N` donde N es el trimestre (1, 2, o 3)
 *
 *           - Si no se especifica: Retorna datos de TODOS los períodos
 *           - Si se especifica: Filtra datos por período académico
 *
 *           Ejemplos: `2025-1`, `2024-3`, `2026-2`
 *         example: '2025-1'
 *     responses:
 *       200:
 *         description: KPIs obtenidos exitosamente
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
 *                   example: 'KPIs del dashboard obtenidos exitosamente'
 *                 data:
 *                   type: object
 *                   properties:
 *                     becarios:
 *                       type: object
 *                       description: KPIs relacionados con estudiantes becarios
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 45
 *                           description: Total de becarios (Activa + Suspendida + Culminada)
 *                         porTipoBeca:
 *                           type: object
 *                           description: Número de becarios ACTIVOS por tipo de beca
 *                           properties:
 *                             Ayudantía:
 *                               type: integer
 *                               example: 20
 *                             Impacto:
 *                               type: integer
 *                               example: 10
 *                             Excelencia:
 *                               type: integer
 *                               example: 8
 *                             Exoneración de Pago:
 *                               type: integer
 *                               example: 5
 *                             Formación Docente:
 *                               type: integer
 *                               example: 2
 *                         sinPlaza:
 *                           type: integer
 *                           example: 5
 *                           description: Becarios ayudantes activos sin plaza asignada
 *                     plazas:
 *                       type: object
 *                       description: KPIs relacionados con plazas de ayudantía
 *                       properties:
 *                         activas:
 *                           type: integer
 *                           example: 30
 *                           description: Número de plazas en estado Activa
 *                         inactivas:
 *                           type: integer
 *                           example: 10
 *                           description: Número de plazas en estado Inactiva
 *                         conCapacidad:
 *                           type: integer
 *                           example: 15
 *                           description: Plazas activas con cupos disponibles
 *                     usuarios:
 *                       type: object
 *                       description: KPIs relacionados con usuarios del sistema
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                           description: Total de usuarios activos registrados
 *                         supervisores:
 *                           type: integer
 *                           example: 25
 *                           description: Total de supervisores activos
 *                     operaciones:
 *                       type: object
 *                       description: KPIs relacionados con operaciones pendientes
 *                       properties:
 *                         postulacionesPendientes:
 *                           type: integer
 *                           example: 12
 *                           description: Postulaciones en estado Pendiente o En Revisión
 *                         reportesPendientes:
 *                           type: integer
 *                           example: 8
 *                           description: Reportes de actividad en estado Pendiente o En Revisión
 *                     metadata:
 *                       type: object
 *                       description: Metadatos de la respuesta
 *                       properties:
 *                         periodoAcademico:
 *                           type: string
 *                           example: '2025-1'
 *                           description: Período académico filtrado o "Todos los períodos"
 *                         fechaGeneracion:
 *                           type: string
 *                           format: date-time
 *                           example: '2025-10-30T15:30:00.000Z'
 *                           description: Timestamp de generación de los KPIs
 *             examples:
 *               kpisTodosPeriodos:
 *                 summary: KPIs de todos los períodos
 *                 value:
 *                   success: true
 *                   message: 'KPIs del dashboard obtenidos exitosamente'
 *                   data:
 *                     becarios:
 *                       total: 45
 *                       porTipoBeca:
 *                         Ayudantía: 20
 *                         Impacto: 10
 *                         Excelencia: 8
 *                         Exoneración de Pago: 5
 *                         Formación Docente: 2
 *                       sinPlaza: 5
 *                     plazas:
 *                       activas: 30
 *                       inactivas: 10
 *                       conCapacidad: 15
 *                     usuarios:
 *                       total: 150
 *                       supervisores: 25
 *                     operaciones:
 *                       postulacionesPendientes: 12
 *                       reportesPendientes: 8
 *                     metadata:
 *                       periodoAcademico: 'Todos los períodos'
 *                       fechaGeneracion: '2025-10-30T15:30:00.000Z'
 *               kpisPeriodoEspecifico:
 *                 summary: KPIs filtrados por período 2025-1
 *                 value:
 *                   success: true
 *                   message: 'KPIs del dashboard obtenidos exitosamente'
 *                   data:
 *                     becarios:
 *                       total: 32
 *                       porTipoBeca:
 *                         Ayudantía: 15
 *                         Impacto: 8
 *                         Excelencia: 5
 *                         Exoneración de Pago: 3
 *                         Formación Docente: 1
 *                       sinPlaza: 3
 *                     plazas:
 *                       activas: 25
 *                       inactivas: 5
 *                       conCapacidad: 12
 *                     usuarios:
 *                       total: 150
 *                       supervisores: 25
 *                     operaciones:
 *                       postulacionesPendientes: 8
 *                       reportesPendientes: 5
 *                     metadata:
 *                       periodoAcademico: '2025-1'
 *                       fechaGeneracion: '2025-10-30T15:30:00.000Z'
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
 *                 error:
 *                   type: string
 *             examples:
 *               formatoInvalido:
 *                 summary: Formato de período inválido
 *                 value:
 *                   success: false
 *                   message: 'Formato de período inválido. Use el formato YYYY-N (ejemplo: 2025-1)'
 *                   error: 'Bad Request'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Acceso denegado - Solo administradores y gestores
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
 *                   example: 'No tienes permisos para acceder a este endpoint. Solo administradores y gestores de becas.'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/kpis',
  authenticate,
  requireRole(['admin']),
  dashboardController.getKPIs
);

/**
 * @swagger
 * /api/v1/dashboard/kpis-general:
 *   get:
 *     summary: Obtener KPIs generales del dashboard (becas + orientación vocacional + usuarios)
 *     description: |
 *       **📊 ENDPOINT DE DASHBOARD GENERAL CON KPIs INTEGRADOS**
 *
 *       Retorna indicadores clave de rendimiento del sistema completo, organizados en 3 categorías:
 *       - Becas (becarios, plazas, postulaciones)
 *       - Orientación Vocacional (tests completados, perfiles, tasa de completitud)
 *       - Usuarios (aspirantes, estudiantes, transiciones)
 *
 *       **🔐 Permisos requeridos:**
 *       - Solo usuarios con rol: 'admin'
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-[1-3]$'
 *         description: Período académico opcional (formato YYYY-N)
 *         example: '2025-1'
 *     responses:
 *       200:
 *         description: KPIs generales obtenidos exitosamente
 *       400:
 *         description: Formato de período inválido
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Acceso denegado - Solo administradores
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/kpis-general',
  authenticate,
  requireRole(['admin']),
  dashboardController.getKPIsGeneral
);

module.exports = router;
