const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  upload,
  handleMulterError,
  validateFileUpload
} = require('../middleware/upload');
const {
  getDocumentosSistema,
  getDocumentoSistemaPorTipo,
  uploadDocumentoSistema,
  deleteDocumentoSistema
} = require('../controllers/systemDocumentsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documentos del Sistema
 *   description: Gestión de documentos públicos del sistema (reglamentos, formularios, etc.)
 */

/**
 * @swagger
 * /api/v1/documents/sistema:
 *   get:
 *     summary: Listar todos los documentos del sistema
 *     description: Obtiene todos los documentos públicos del sistema. Accesible por todos los usuarios autenticados.
 *     tags: [Documentos del Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documentos del sistema obtenidos exitosamente
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
 *                   example: Documentos del sistema obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     documentos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           tipoDocumento:
 *                             type: string
 *                             example: reglamento
 *                           nombreOriginal:
 *                             type: string
 *                             example: Reglamento_Becas_2025.pdf
 *                           tamano:
 *                             type: string
 *                             example: 2.5 MB
 *                           tamanoBytes:
 *                             type: integer
 *                             example: 2621440
 *                           mimeType:
 *                             type: string
 *                             example: application/pdf
 *                           extension:
 *                             type: string
 *                             example: .pdf
 *                           fechaSubida:
 *                             type: string
 *                             format: date-time
 *                           url:
 *                             type: string
 *                             example: /api/v1/documents/abc-123
 *                           urlDescarga:
 *                             type: string
 *                             example: /api/v1/documents/abc-123?download=true
 *       500:
 *         description: Error del servidor
 */
router.get('/', authenticate, asyncHandler(getDocumentosSistema));

/**
 * @swagger
 * /api/v1/documents/sistema/tipo/{tipo}:
 *   get:
 *     summary: Obtener documento del sistema por tipo
 *     description: Obtiene el documento del sistema más reciente de un tipo específico (ej. reglamento). Accesible por todos los usuarios autenticados.
 *     tags: [Documentos del Sistema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *         description: Tipo de documento a buscar (cualquier valor permitido)
 *         example: reglamento
 *     responses:
 *       200:
 *         description: Documento del sistema obtenido exitosamente
 *       404:
 *         description: No se encontró un documento del sistema de ese tipo
 *       400:
 *         description: Tipo de documento inválido
 *       500:
 *         description: Error del servidor
 */
router.get('/tipo/:tipo', authenticate, asyncHandler(getDocumentoSistemaPorTipo));

/**
 * @swagger
 * /api/v1/documents/sistema/upload:
 *   post:
 *     summary: Subir un documento del sistema
 *     description: Permite a administradores y gestores de becas subir documentos públicos del sistema. Solo puede existir un documento activo por tipo.
 *     tags: [Documentos del Sistema]
 *     security:
 *       - bearerAuth: []
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
 *                 example: reglamento
 *                 description: Tipo de documento del sistema (cualquier valor permitido - sin restricciones)
 *               observaciones:
 *                 type: string
 *                 description: Observaciones adicionales sobre el documento
 *                 example: Reglamento actualizado para el año 2025
 *     responses:
 *       201:
 *         description: Documento del sistema subido exitosamente
 *       400:
 *         description: Error de validación o archivo inválido
 *       403:
 *         description: No autorizado (requiere rol admin o gestor-becas)
 *       409:
 *         description: Ya existe un documento del sistema de ese tipo
 *       500:
 *         description: Error del servidor
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  handleMulterError,
  validateFileUpload,
  asyncHandler(uploadDocumentoSistema)
);

/**
 * @swagger
 * /api/v1/documents/sistema/{id}:
 *   delete:
 *     summary: Eliminar un documento del sistema
 *     description: Permite a administradores eliminar documentos del sistema. Realiza soft delete.
 *     tags: [Documentos del Sistema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del documento del sistema a eliminar
 *     responses:
 *       200:
 *         description: Documento del sistema eliminado exitosamente
 *       403:
 *         description: No autorizado (requiere rol admin)
 *       404:
 *         description: Documento del sistema no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', authenticate, asyncHandler(deleteDocumentoSistema));

module.exports = router;
