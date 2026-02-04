const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const orientacionVocacionalController = require('../controllers/orientacionVocacionalController');
const {
  validateIniciarTest,
  validateGuardarRespuestasRonda1,
  validateGuardarRespuestasRonda2,
  validateSesionIdParam,
  validateAnalizarCambioCarrera,
  validateGuardarRespuestasICO,
  validateSesionIdParamICO,
  validateActualizarTrayectoria,
} = require('../validators/orientacionVocacionalValidators');

/**
 * @swagger
 * tags:
 *   name: Orientación Vocacional
 *   description: Sistema de orientación vocacional con tests Holland RIASEC
 */

/**
 * @swagger
 * /api/v1/orientacion/iniciar-test:
 *   post:
 *     summary: Inicia una nueva sesión de test de orientación vocacional
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipoTest
 *             properties:
 *               tipoTest:
 *                 type: string
 *                 enum: [Holland_RIASEC, Kuder]
 *                 example: Holland_RIASEC
 *     responses:
 *       201:
 *         description: Test iniciado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/iniciar-test',
  authenticate,
  validateIniciarTest,
  orientacionVocacionalController.iniciarTest
);

/**
 * @swagger
 * /api/v1/orientacion/guardar-respuestas-ronda-1:
 *   post:
 *     summary: Guarda las respuestas de la ronda 1 y genera preguntas para la ronda 2
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sesionId
 *               - respuestas
 *             properties:
 *               sesionId:
 *                 type: string
 *                 format: uuid
 *               respuestas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     preguntaId:
 *                       type: string
 *                       format: uuid
 *                     respuesta:
 *                       type: boolean
 *                     tiempoRespuesta:
 *                       type: integer
 *                     nivelSeguridad:
 *                       type: string
 *                       enum: [seguro, no_seguro]
 *     responses:
 *       200:
 *         description: Respuestas guardadas exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/guardar-respuestas-ronda-1',
  authenticate,
  validateGuardarRespuestasRonda1,
  orientacionVocacionalController.guardarRespuestasRonda1
);

/**
 * @swagger
 * /api/v1/orientacion/guardar-respuestas-ronda-2:
 *   post:
 *     summary: Guarda las respuestas de la ronda 2 y procesa el test completo
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sesionId
 *               - respuestas
 *             properties:
 *               sesionId:
 *                 type: string
 *                 format: uuid
 *               respuestas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     preguntaId:
 *                       type: string
 *                       format: uuid
 *                     respuesta:
 *                       type: boolean
 *                     tiempoRespuesta:
 *                       type: integer
 *                     nivelSeguridad:
 *                       type: string
 *                       enum: [seguro, no_seguro]
 *     responses:
 *       200:
 *         description: Test completado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post(
  '/guardar-respuestas-ronda-2',
  authenticate,
  validateGuardarRespuestasRonda2,
  orientacionVocacionalController.guardarRespuestasRonda2
);

/**
 * @swagger
 * /api/v1/orientacion/sesion/{sesionId}:
 *   get:
 *     summary: Obtiene la información de una sesión de test
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sesionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sesión obtenida exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permisos para acceder a esta sesión
 *       404:
 *         description: Sesión no encontrada
 */
router.get(
  '/sesion/:sesionId',
  authenticate,
  validateSesionIdParam,
  orientacionVocacionalController.obtenerSesion
);

// --- Test ICO (una sola ronda, todas las preguntas, resultado + LLM) ---
router.post(
  '/iniciar-test-ico',
  authenticate,
  orientacionVocacionalController.iniciarTestIco
);
router.get(
  '/sesion-ico/:sesionId/preguntas',
  authenticate,
  validateSesionIdParamICO,
  orientacionVocacionalController.obtenerPreguntasIco
);
router.post(
  '/guardar-respuestas-ico',
  authenticate,
  validateGuardarRespuestasICO,
  orientacionVocacionalController.guardarRespuestasIcoYFinalizar
);
router.get(
  '/resultados-ico/:sesionId',
  authenticate,
  validateSesionIdParamICO,
  orientacionVocacionalController.obtenerResultadoIco
);

/**
 * @swagger
 * /api/v1/orientacion/historial-especialista:
 *   get:
 *     summary: Obtiene el historial de tests de los usuarios para el especialista
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/historial-especialista',
  orientacionVocacionalController.obtenerHistorialEspecialista
);

/**
 * @swagger
 * /api/v1/orientacion/resultados/{sesionId}:
 *   get:
 *     summary: Obtiene los resultados completos de una sesión de test
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sesionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resultados obtenidos exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permisos para acceder a esta sesión
 *       404:
 *         description: Resultados no encontrados
 */
router.get(
  '/resultados/:sesionId',
  authenticate,
  validateSesionIdParam,
  orientacionVocacionalController.obtenerResultados
);

/**
 * @swagger
 * /api/v1/orientacion/mi-perfil-vocacional:
 *   get:
 *     summary: Obtiene el perfil vocacional completo del usuario autenticado
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil vocacional obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
// Trayectoria académica (bachillerato): materias y notas por año/lapso y por área
router.get(
  '/trayectoria-academica',
  authenticate,
  orientacionVocacionalController.obtenerTrayectoriaAcademica
);
router.put(
  '/trayectoria-academica',
  authenticate,
  validateActualizarTrayectoria,
  orientacionVocacionalController.actualizarTrayectoriaAcademica
);

router.get(
  '/mi-perfil-vocacional',
  authenticate,
  orientacionVocacionalController.obtenerPerfilVocacional
);

/**
 * @swagger
 * /api/v1/orientacion/historial:
 *   get:
 *     summary: Obtiene el historial de tests del usuario autenticado
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
router.get(
  '/historial',
  authenticate,
  orientacionVocacionalController.obtenerHistorial
);

/**
 * @swagger
 * /api/v1/orientacion/recomendaciones-continuas:
 *   post:
 *     summary: Genera recomendaciones continuas basadas en el perfil del usuario
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recomendaciones generadas exitosamente
 *       401:
 *         description: No autenticado
 *       404:
 *         description: No se encontró un resultado de test para el usuario
 */
router.post(
  '/recomendaciones-continuas',
  authenticate,
  orientacionVocacionalController.generarRecomendacionesContinuas
);

/**
 * @swagger
 * /api/v1/orientacion/analizar-cambio-carrera:
 *   post:
 *     summary: Analiza la viabilidad de un cambio de carrera
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nuevaCarreraId
 *             properties:
 *               nuevaCarreraId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Análisis generado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Carrera no encontrada
 */
router.post(
  '/analizar-cambio-carrera',
  authenticate,
  validateAnalizarCambioCarrera,
  orientacionVocacionalController.analizarCambioCarrera
);


module.exports = router;
