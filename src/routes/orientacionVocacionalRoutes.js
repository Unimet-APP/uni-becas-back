const express = require('express');
const router = express.Router();
const orientacionController = require('../controllers/orientacionVocacionalController');
const authenticate = require('../middleware/auth').authenticate;
const rbac = require('../middleware/rbac');
const {
  validateIniciarTest,
  validateGuardarRespuestasRonda1,
  validateGuardarRespuestasRonda2,
  validateAnalizarCambioCarrera,
  validateSesionIdParam,
} = require('../validators/orientacionVocacionalValidators');

/**
 * @route   POST /api/v1/orientacion/iniciar-test
 * @desc    Inicia un nuevo test de orientación vocacional
 * @access  Private (estudiante)
 */
router.post(
  '/iniciar-test',
  authenticate,
  rbac(['estudiante']),
  validateIniciarTest,
  orientacionController.iniciarTest
);

/**
 * @route   POST /api/v1/orientacion/guardar-respuestas-ronda-1
 * @desc    Guarda respuestas de Ronda 1 y obtiene preguntas de Ronda 2
 * @access  Private (estudiante)
 */
router.post(
  '/guardar-respuestas-ronda-1',
  authenticate,
  rbac(['estudiante']),
  validateGuardarRespuestasRonda1,
  orientacionController.guardarRespuestasRonda1
);

/**
 * @route   POST /api/v1/orientacion/guardar-respuestas-ronda-2
 * @desc    Guarda respuestas de Ronda 2 y procesa el test completo
 * @access  Private (estudiante)
 */
router.post(
  '/guardar-respuestas-ronda-2',
  authenticate,
  rbac(['estudiante']),
  validateGuardarRespuestasRonda2,
  orientacionController.guardarRespuestasRonda2
);

/**
 * @route   GET /api/v1/orientacion/sesion/:sesionId
 * @desc    Obtiene información de una sesión específica
 * @access  Private (estudiante)
 */
router.get(
  '/sesion/:sesionId',
  authenticate,
  rbac(['estudiante']),
  validateSesionIdParam,
  orientacionController.obtenerSesion
);

/**
 * @route   GET /api/v1/orientacion/resultados/:sesionId
 * @desc    Obtiene resultados completos de una sesión
 * @access  Private (estudiante)
 */
router.get(
  '/resultados/:sesionId',
  authenticate,
  rbac(['estudiante']),
  validateSesionIdParam,
  orientacionController.obtenerResultados
);

/**
 * @route   GET /api/v1/orientacion/mi-perfil-vocacional
 * @desc    Obtiene el perfil vocacional completo del usuario
 * @access  Private (estudiante)
 */
router.get(
  '/mi-perfil-vocacional',
  authenticate,
  rbac(['estudiante']),
  orientacionController.obtenerPerfilVocacional
);

/**
 * @route   GET /api/v1/orientacion/historial
 * @desc    Obtiene el historial de tests del usuario
 * @access  Private (estudiante)
 */
router.get(
  '/historial',
  authenticate,
  rbac(['estudiante']),
  orientacionController.obtenerHistorial
);

/**
 * @route   POST /api/v1/orientacion/recomendaciones-continuas
 * @desc    Genera recomendaciones actualizadas (acompañamiento continuo)
 * @access  Private (estudiante)
 */
router.post(
  '/recomendaciones-continuas',
  authenticate,
  rbac(['estudiante']),
  orientacionController.generarRecomendacionesContinuas
);

/**
 * @route   POST /api/v1/orientacion/analizar-cambio-carrera
 * @desc    Analiza la viabilidad de cambiar de carrera
 * @access  Private (estudiante)
 */
router.post(
  '/analizar-cambio-carrera',
  authenticate,
  rbac(['estudiante']),
  validateAnalizarCambioCarrera,
  orientacionController.analizarCambioCarrera
);

module.exports = router;

