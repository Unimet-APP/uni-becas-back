const express = require('express');
const router = express.Router();
const orientacionController = require('../controllers/orientacionVocacionalController');
const authenticate = require('../middleware/auth').authenticate;
const {
  validateIniciarTest,
  validateGuardarRespuestasRonda1,
  validateGuardarRespuestasRonda2,
  validateAnalizarCambioCarrera,
  validateSesionIdParam,
} = require('../validators/orientacionVocacionalValidators');

/**
 * @swagger
 * tags:
 *   name: Orientación Vocacional
 *   description: Sistema inteligente de orientación vocacional con LLM y tests psicométricos
 */

/**
 * @swagger
 * /api/v1/orientacion/iniciar-test:
 *   post:
 *     summary: Inicia un nuevo test de orientación vocacional
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Crea una nueva sesión de test y selecciona las preguntas iniciales (Ronda 1).
 *       El sistema selecciona inteligentemente 4 preguntas por cada dimensión del test elegido.
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
 *                 enum: [Kuder, Holland_RIASEC]
 *                 example: Holland_RIASEC
 *                 description: Tipo de test psicométrico a realizar
 *     responses:
 *       200:
 *         description: Test iniciado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Test iniciado correctamente
 *               data:
 *                 sesionId: "123e4567-e89b-12d3-a456-426614174000"
 *                 tipoTest: "Holland_RIASEC"
 *                 estado: "ronda_1"
 *                 preguntas: []
 *                 fechaInicio: "2025-01-15T10:00:00Z"
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol estudiante)
 */
router.post(
  '/iniciar-test',
  authenticate,
  validateIniciarTest,
  orientacionController.iniciarTest
);

/**
 * @swagger
 * /api/v1/orientacion/guardar-respuestas-ronda-1:
 *   post:
 *     summary: Guarda respuestas de Ronda 1 y obtiene preguntas de Ronda 2
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Guarda las respuestas de la primera ronda y utiliza el LLM para seleccionar
 *       preguntas adaptativas de la Ronda 2, enfocándose en áreas ambiguas o de interés.
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
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               respuestas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - preguntaId
 *                     - respuesta
 *                   properties:
 *                     preguntaId:
 *                       type: string
 *                       format: uuid
 *                     respuesta:
 *                       oneOf:
 *                         - type: string
 *                         - type: number
 *                         - type: boolean
 *                         - type: array
 *                     tiempoSegundos:
 *                       type: integer
 *                       minimum: 0
 *                     nivelSeguridad:
 *                       type: string
 *                       enum: [bajo, medio, alto]
 *     responses:
 *       200:
 *         description: Respuestas guardadas y preguntas de Ronda 2 generadas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error de validación o sesión inválida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  '/guardar-respuestas-ronda-1',
  authenticate,
  validateGuardarRespuestasRonda1,
  orientacionController.guardarRespuestasRonda1
);

/**
 * @swagger
 * /api/v1/orientacion/guardar-respuestas-ronda-2:
 *   post:
 *     summary: Guarda respuestas de Ronda 2 y procesa el test completo
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Guarda las respuestas finales, calcula puntuaciones, detecta discrepancias,
 *       valida con trayectoria académica y genera recomendaciones usando LLM.
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
 *                   required:
 *                     - preguntaId
 *                     - respuesta
 *                   properties:
 *                     preguntaId:
 *                       type: string
 *                       format: uuid
 *                     respuesta:
 *                       oneOf:
 *                         - type: string
 *                         - type: number
 *                         - type: boolean
 *                         - type: array
 *                     tiempoSegundos:
 *                       type: integer
 *                     nivelSeguridad:
 *                       type: string
 *                       enum: [bajo, medio, alto]
 *     responses:
 *       200:
 *         description: Test completado y resultados generados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  '/guardar-respuestas-ronda-2',
  authenticate,
  validateGuardarRespuestasRonda2,
  orientacionController.guardarRespuestasRonda2
);

/**
 * @swagger
 * /api/v1/orientacion/sesion/{sesionId}:
 *   get:
 *     summary: Obtiene información de una sesión específica
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
 *         description: ID de la sesión de test
 *     responses:
 *       200:
 *         description: Información de la sesión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Sesión no encontrada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get(
  '/sesion/:sesionId',
  authenticate,
  validateSesionIdParam,
  orientacionController.obtenerSesion
);

/**
 * @swagger
 * /api/v1/orientacion/resultados/{sesionId}:
 *   get:
 *     summary: Obtiene resultados completos de una sesión
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
 *         description: ID de la sesión de test
 *     responses:
 *       200:
 *         description: Resultados completos del test
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Sesión o resultados no encontrados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get(
  '/resultados/:sesionId',
  authenticate,
  validateSesionIdParam,
  orientacionController.obtenerResultados
);

/**
 * @swagger
 * /api/v1/orientacion/mi-perfil-vocacional:
 *   get:
 *     summary: Obtiene el perfil vocacional completo del usuario
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna el perfil vocacional consolidado del estudiante, incluyendo:
 *       - Últimos resultados de tests
 *       - Trayectoria académica
 *       - Recomendaciones actualizadas
 *       - Análisis de consistencia
 *     responses:
 *       200:
 *         description: Perfil vocacional del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: No se encontró perfil vocacional
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get(
  '/mi-perfil-vocacional',
  authenticate,
  orientacionController.obtenerPerfilVocacional
);

/**
 * @swagger
 * /api/v1/orientacion/historial:
 *   get:
 *     summary: Obtiene el historial de tests del usuario
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna todas las sesiones de test realizadas por el estudiante
 *     responses:
 *       200:
 *         description: Historial de tests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get(
  '/historial',
  authenticate,
  orientacionController.obtenerHistorial
);

/**
 * @swagger
 * /api/v1/orientacion/recomendaciones-continuas:
 *   post:
 *     summary: Genera recomendaciones actualizadas (acompañamiento continuo)
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Genera nuevas recomendaciones basadas en:
 *       - Cambios en la trayectoria académica
 *       - Nuevos intereses o actividades
 *       - Evolución del perfil vocacional
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contextoAdicional:
 *                 type: string
 *                 description: Información adicional sobre cambios o nuevos intereses
 *     responses:
 *       200:
 *         description: Recomendaciones actualizadas generadas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  '/recomendaciones-continuas',
  authenticate,
  orientacionController.generarRecomendacionesContinuas
);

/**
 * @swagger
 * /api/v1/orientacion/analizar-cambio-carrera:
 *   post:
 *     summary: Analiza la viabilidad de cambiar de carrera
 *     tags: [Orientación Vocacional]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Utiliza el LLM para analizar la viabilidad de cambiar de carrera,
 *       considerando perfil vocacional, trayectoria académica y nueva carrera propuesta.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carreraDestinoId
 *             properties:
 *               carreraDestinoId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la carrera a la que desea cambiar
 *               razones:
 *                 type: string
 *                 description: Razones por las que desea cambiar de carrera
 *               preocupaciones:
 *                 type: string
 *                 description: Preocupaciones sobre el cambio
 *     responses:
 *       200:
 *         description: Análisis de cambio de carrera completado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  '/analizar-cambio-carrera',
  authenticate,
  validateAnalizarCambioCarrera,
  orientacionController.analizarCambioCarrera
);

module.exports = router;

