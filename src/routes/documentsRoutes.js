const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  upload,
  handleMulterError,
  validateFileUpload
} = require('../middleware/upload');
const {
  uploadDocumento,
  getDocumento,
  deleteDocumento,
  getDocumentosByPostulacion,
  getDocumentosByPostulacionPublic,
  getMisDocumentos,
  getDocumentoMetadata
} = require('../controllers/documentsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documentos
 *   description: Gestión de documentos y archivos
 */

/**
 * @swagger
 * /api/v1/documents/upload:
 *   post:
 *     summary: Subir un documento (endpoint público)
 *     tags: [Documentos]
 *     description: Este endpoint permite subir documentos sin autenticación para el proceso de postulación pública. Si se proporciona un token, se validarán los permisos de usuario.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - tipoDocumento
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, JPG, PNG - máx 10MB)
 *               tipoDocumento:
 *                 type: string
 *                 example: historico_notas
 *                 description: Tipo de documento (cualquier valor permitido - sin restricciones)
 *               postulacionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la postulación (opcional)
 *               observaciones:
 *                 type: string
 *                 description: Observaciones adicionales sobre el documento
 *     responses:
 *       201:
 *         description: Documento subido exitosamente
 *       400:
 *         description: Error de validación o archivo inválido
 *       403:
 *         description: No autorizado
 */
router.post(
  '/upload',
  upload.single('file'),
  handleMulterError,
  validateFileUpload,
  asyncHandler(uploadDocumento)
);

/**
 * @swagger
 * /api/v1/documents/public/postulacion/{postulacionId}:
 *   get:
 *     summary: Listar documentos de una postulación (endpoint público)
 *     tags: [Documentos]
 *     description: Endpoint público para consultar documentos de una postulación sin autenticación
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postulacionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la postulación
 *     responses:
 *       200:
 *         description: Documentos obtenidos exitosamente
 *       404:
 *         description: Postulación no encontrada
 */
router.get('/public/postulacion/:postulacionId', asyncHandler(getDocumentosByPostulacionPublic));



/**
 * @swagger
 * /api/v1/documents/mis-documentos:
 *   get:
 *     summary: Listar todos los documentos del usuario autenticado
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documentos obtenidos exitosamente
 */
router.get('/mis-documentos', authenticate, asyncHandler(getMisDocumentos));

/**
 * @swagger
 * /api/v1/documents/postulacion/{postulacionId}:
 *   get:
 *     summary: Listar documentos de una postulación
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postulacionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la postulación
 *     responses:
 *       200:
 *         description: Documentos obtenidos exitosamente
 *       404:
 *         description: Postulación no encontrada
 *       403:
 *         description: No autorizado
 */
router.get('/postulacion/:postulacionId', authenticate, asyncHandler(getDocumentosByPostulacion));

/**
 * @swagger
 * /api/v1/documents/{id}/metadata:
 *   get:
 *     summary: Obtener metadata de un documento (sin descargar)
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Metadata obtenida exitosamente
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No autorizado
 */
router.get('/:id/metadata', authenticate, asyncHandler(getDocumentoMetadata));

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Descargar/visualizar un documento
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento
 *       - in: query
 *         name: download
 *         required: false
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Forzar descarga en lugar de visualización inline
 *     responses:
 *       200:
 *         description: Documento obtenido exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No autorizado
 */
router.get('/:id', authenticate, asyncHandler(getDocumento));

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   delete:
 *     summary: Eliminar un documento
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento eliminado exitosamente
 *       404:
 *         description: Documento no encontrado
 *       403:
 *         description: No autorizado (solo el dueño o admin/gestor pueden eliminar)
 */
router.delete('/:id', authenticate, asyncHandler(deleteDocumento));

module.exports = router;
