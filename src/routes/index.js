const express = require('express');
const authRoutes = require('./authRoutes');
const usersRoutes = require('./usersRoutes');
const postulacionesRoutes = require('./postulacionesRoutes');
const ayudantiasRoutes = require('./ayudantiasRoutes');
const supervisoresRoutes = require('./supervisoresRoutes');
const documentsRoutes = require('./documentsRoutes');
const systemDocumentsRoutes = require('./systemDocumentsRoutes');
const auditRoutes = require('./auditRoutes');
const disponibilidadRoutes = require('./disponibilidadRoutes');
const plazasRoutes = require('./plazasRoutes');
const becariosRoutes = require('./becariosRoutes');
const postulacionesPlazasRoutes = require('./postulacionesPlazasRoutes');
const reportesSimplificadosRoutes = require('./reportesSimplificadosRoutes');
const reportesExportRoutes = require('./reportesExportRoutes');
const configuracionRoutes = require('./configuracionRoutes');
const dashboardRoutes = require('./dashboardRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de Gestión de Becas - API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0 - Backend completamente limpio'
  });
});

// ✅ Todas las rutas implementadas
router.use('/v1/auth', authRoutes);
router.use('/v1/users', usersRoutes);
router.use('/v1/postulaciones', postulacionesRoutes);
router.use('/v1/ayudantias', ayudantiasRoutes);
router.use('/v1/supervisores', supervisoresRoutes);
router.use('/v1/plazas', plazasRoutes);
router.use('/v1/becarios', becariosRoutes);
router.use('/v1/postulaciones-plazas', postulacionesPlazasRoutes);
router.use('/v1/reportes', reportesSimplificadosRoutes);
router.use('/v1/reportes/exportar', reportesExportRoutes);
router.use('/v1/configuracion', configuracionRoutes);
router.use('/v1/dashboard', dashboardRoutes);
// IMPORTANTE: Documentos del sistema ANTES de documents para evitar conflictos de rutas
router.use('/v1/documents/sistema', systemDocumentsRoutes);
router.use('/v1/documents', documentsRoutes);
router.use('/v1/audit', auditRoutes);
router.use('/v1/disponibilidad', disponibilidadRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de Gestión de Becas - Universidad Metropolitana',
    version: '2.0.0',
    description: 'API reconstruida desde cero para la gestión integral de becas universitarias',
    estado: 'Fase 2 en progreso - Módulo de autenticación implementado',
    modelos_implementados: [
      'Usuario (con campos en español)',
      'Postulacion (con validaciones venezolanas)',
      'EstudianteBecario (gestión de becas activas)',
      'Plaza (plazas de ayudantías)',
      'ReporteActividad (seguimiento de actividades)'
    ],
    endpoints_actuales: {
      health: 'GET /api/health',
      documentacion: 'GET /api'
    },
    endpoints_implementados: {
      auth: {
        login: 'POST /api/v1/auth/login',
        register: 'POST /api/v1/auth/register',
        logout: 'POST /api/v1/auth/logout',
        refresh: 'POST /api/v1/auth/refresh',
        forgotPassword: 'POST /api/v1/auth/forgot-password',
        resetPassword: 'POST /api/v1/auth/reset-password',
        changePassword: 'POST /api/v1/auth/change-password',
        profile: 'GET /api/v1/auth/profile',
        updateProfile: 'PUT /api/v1/auth/profile',
        me: 'GET /api/v1/auth/me',
        verifyToken: 'POST /api/v1/auth/verify-token'
      }
    },
    endpoints_planificados_siguiente_fase: {
      usuarios: {
        crear: 'POST /api/v1/usuarios',
        listar: 'GET /api/v1/usuarios',
        obtener: 'GET /api/v1/usuarios/:id',
        actualizar: 'PUT /api/v1/usuarios/:id'
      },
      postulaciones: {
        crear: 'POST /api/v1/postulaciones',
        listar: 'GET /api/v1/postulaciones',
        aprobar: 'PUT /api/v1/postulaciones/:id/aprobar',
        rechazar: 'PUT /api/v1/postulaciones/:id/rechazar'
      }
    },
    proximos_pasos: [
      'Implementar controladores para nuevos modelos',
      'Crear rutas para postulaciones',
      'Desarrollar sistema de ayudantías',
      'Implementar reportes y auditoría'
    ]
  });
});

module.exports = router;