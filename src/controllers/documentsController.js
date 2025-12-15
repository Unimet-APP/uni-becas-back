const path = require('path');
const fs = require('fs').promises;
const { Documento, Postulacion, Usuario, sequelize } = require('../models');
const { deleteFile, fileExists } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../config/responses');
const { MENSAJES_ERROR } = require('../config/constants');

/**
 * Subir un documento
 * POST /api/v1/documents/upload
 */
const uploadDocumento = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Validar que se haya subido un archivo (ya validado por middleware, pero doble check)
    if (!req.file) {
      return sendError(res, 'Debe subir un archivo', 400);
    }

    const { tipoDocumento, postulacionId, observaciones } = req.body;
    const usuarioId = req.user?.id || null;

    // Validar que la postulación existe y pertenece al usuario (o es admin/gestor)
    if (postulacionId) {
      const postulacion = await Postulacion.findByPk(postulacionId);

      if (!postulacion) {
        // Eliminar archivo subido si la postulación no existe
        await deleteFile(req.file.path);
        return sendError(res, MENSAJES_ERROR.POSTULACION_NO_ENCONTRADA, 404);
      }

      // Verificar permisos: solo el dueño o admin/gestor pueden subir documentos (solo si hay usuario autenticado)
      if (req.user && postulacion.usuarioId !== usuarioId && !['admin', 'gestor-becas'].includes(req.user.role)) {
        await deleteFile(req.file.path);
        return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
      }
    }

    // Crear registro en base de datos
    const documento = await Documento.create({
      usuarioId,
      postulacionId: postulacionId || null,
      tipoDocumento,
      nombreOriginal: req.file.originalname,
      nombreEncriptado: req.file.filename,
      rutaArchivo: req.file.path,
      mimeType: req.file.mimetype,
      extension: path.extname(req.file.originalname).toLowerCase(),
      tamanoBytes: req.file.size,
      observaciones: observaciones || null,
      activo: true
    }, { transaction });

    // Si hay postulación, actualizar el campo documentos (JSON array)
    if (postulacionId) {
      const postulacion = await Postulacion.findByPk(postulacionId, { transaction });
      const documentosActuales = postulacion.documentos || [];

      // Agregar nuevo documento al array
      documentosActuales.push({
        id: documento.id,
        tipo: tipoDocumento,
        nombreOriginal: documento.nombreOriginal,
        fechaSubida: documento.createdAt
      });

      await postulacion.update({ documentos: documentosActuales }, { transaction });
    }

    await transaction.commit();

    return sendSuccess(res, {
      id: documento.id,
      tipoDocumento: documento.tipoDocumento,
      nombreOriginal: documento.nombreOriginal,
      tamano: documento.getTamanoLegible(),
      fechaSubida: documento.createdAt,
      url: `/api/v1/documents/${documento.id}`
    }, 'Documento subido exitosamente', 201);

  } catch (error) {
    await transaction.rollback();

    // Si hubo error, eliminar el archivo físico
    if (req.file && req.file.path) {
      try {
        await deleteFile(req.file.path);
      } catch (deleteError) {
        console.error('Error al eliminar archivo tras fallo:', deleteError);
      }
    }

    console.error('Error al subir documento:', error);
    return sendError(res, `Error al subir documento: ${error.message}`, 500);
  }
};

/**
 * Obtener/Descargar un documento
 * GET /api/v1/documents/:id
 */
const getDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;

    // Buscar documento
    const documento = await Documento.findOne({
      where: { id, activo: true },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: Postulacion,
          as: 'postulacion',
          attributes: ['id', 'usuarioId', 'estado'],
          required: false
        }
      ]
    });

    if (!documento) {
      return sendError(res, 'Documento no encontrado', 404);
    }

    // Verificar permisos
    if (!documento.puedeSerVistoPor(usuarioId, usuarioRole)) {
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    // Verificar que el archivo existe físicamente
    const archivoExiste = await fileExists(documento.rutaArchivo);
    if (!archivoExiste) {
      return sendError(res, 'Archivo físico no encontrado en el servidor', 404);
    }

    // Si el query param es ?download=true, forzar descarga
    const forceDownload = req.query.download === 'true';

    // Configurar headers para descarga o visualización
    res.setHeader('Content-Type', documento.mimeType);

    if (forceDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(documento.nombreOriginal)}"`);
    } else {
      // Para PDFs, permitir visualización inline
      if (documento.esPDF()) {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(documento.nombreOriginal)}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(documento.nombreOriginal)}"`);
      }
    }

    // Enviar archivo
    return res.sendFile(path.resolve(documento.rutaArchivo));

  } catch (error) {
    console.error('Error al obtener documento:', error);
    return sendError(res, `Error al obtener documento: ${error.message}`, 500);
  }
};

/**
 * Eliminar un documento
 * DELETE /api/v1/documents/:id
 */
const deleteDocumento = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;

    // Buscar documento
    const documento = await Documento.findOne({
      where: { id, activo: true },
      include: [
        {
          model: Postulacion,
          as: 'postulacion'
        }
      ],
      transaction
    });

    if (!documento) {
      await transaction.rollback();
      return sendError(res, 'Documento no encontrado', 404);
    }

    // Verificar permisos
    if (!documento.puedeSerEliminadoPor(usuarioId, usuarioRole)) {
      await transaction.rollback();
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    // Si tiene postulación asociada, actualizar el array de documentos
    if (documento.postulacionId) {
      const postulacion = await Postulacion.findByPk(documento.postulacionId, { transaction });

      if (postulacion) {
        const documentosActuales = postulacion.documentos || [];
        const documentosActualizados = documentosActuales.filter(doc => doc.id !== documento.id);
        await postulacion.update({ documentos: documentosActualizados }, { transaction });
      }
    }

    // Soft delete en base de datos
    await documento.softDelete(usuarioId);

    // Eliminar archivo físico
    try {
      await deleteFile(documento.rutaArchivo);
    } catch (deleteError) {
      console.error('Error al eliminar archivo físico:', deleteError);
      // No fallar la operación si el archivo ya no existe
    }

    await transaction.commit();

    return sendSuccess(res, null, 'Documento eliminado exitosamente', 200);

  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar documento:', error);
    return sendError(res, `Error al eliminar documento: ${error.message}`, 500);
  }
};

/**
 * Listar documentos de una postulación
 * GET /api/v1/documents/postulacion/:postulacionId
 */
const getDocumentosByPostulacion = async (req, res) => {
  try {
    const { postulacionId } = req.params;
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;

    // Buscar postulación
    const postulacion = await Postulacion.findByPk(postulacionId);

    if (!postulacion) {
      return sendError(res, MENSAJES_ERROR.POSTULACION_NO_ENCONTRADA, 404);
    }

    // Verificar permisos: solo el dueño o admin/gestor/supervisor pueden ver
    if (postulacion.usuarioId !== usuarioId && !['admin', 'gestor-becas', 'supervisor'].includes(usuarioRole)) {
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    // Buscar documentos
    const documentos = await Documento.findAll({
      where: {
        postulacionId,
        activo: true
      },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Formatear respuesta
    const documentosFormateados = documentos.map(doc => ({
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      nombreOriginal: doc.nombreOriginal,
      tamano: doc.getTamanoLegible(),
      tamanoBytes: doc.tamanoBytes,
      mimeType: doc.mimeType,
      extension: doc.extension,
      fechaSubida: doc.createdAt,
      usuario: doc.usuario,
      url: `/api/v1/documents/${doc.id}`,
      urlDescarga: `/api/v1/documents/${doc.id}?download=true`
    }));

    return sendSuccess(res, {
      postulacionId,
      total: documentosFormateados.length,
      documentos: documentosFormateados
    }, 'Documentos obtenidos exitosamente', 200);

  } catch (error) {
    console.error('Error al obtener documentos de postulación:', error);
    return sendError(res, `Error al obtener documentos: ${error.message}`, 500);
  }
};

/**
 * Listar todos los documentos del usuario autenticado
 * GET /api/v1/documents/mis-documentos
 */
const getMisDocumentos = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Buscar documentos del usuario
    const documentos = await Documento.findAll({
      where: {
        usuarioId,
        activo: true
      },
      include: [
        {
          model: Postulacion,
          as: 'postulacion',
          attributes: ['id', 'estado', 'tipoBeca']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Formatear respuesta
    const documentosFormateados = documentos.map(doc => ({
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      nombreOriginal: doc.nombreOriginal,
      tamano: doc.getTamanoLegible(),
      tamanoBytes: doc.tamanoBytes,
      mimeType: doc.mimeType,
      extension: doc.extension,
      fechaSubida: doc.createdAt,
      postulacion: doc.postulacion,
      url: `/api/v1/documents/${doc.id}`,
      urlDescarga: `/api/v1/documents/${doc.id}?download=true`
    }));

    return sendSuccess(res, {
      total: documentosFormateados.length,
      documentos: documentosFormateados
    }, 'Documentos obtenidos exitosamente', 200);

  } catch (error) {
    console.error('Error al obtener documentos del usuario:', error);
    return sendError(res, `Error al obtener documentos: ${error.message}`, 500);
  }
};

/**
 * Obtener metadata de un documento (sin descargar el archivo)
 * GET /api/v1/documents/:id/metadata
 */
const getDocumentoMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;

    // Buscar documento
    const documento = await Documento.findOne({
      where: { id, activo: true },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          required: false
        },
        {
          model: Postulacion,
          as: 'postulacion',
          attributes: ['id', 'usuarioId', 'estado', 'tipoBeca'],
          required: false
        }
      ]
    });

    if (!documento) {
      return sendError(res, 'Documento no encontrado', 404);
    }

    // Verificar permisos
    if (!documento.puedeSerVistoPor(usuarioId, usuarioRole)) {
      return sendError(res, MENSAJES_ERROR.ACCESO_DENEGADO, 403);
    }

    // Formatear respuesta
    const metadata = {
      id: documento.id,
      tipoDocumento: documento.tipoDocumento,
      nombreOriginal: documento.nombreOriginal,
      tamano: documento.getTamanoLegible(),
      tamanoBytes: documento.tamanoBytes,
      mimeType: documento.mimeType,
      extension: documento.extension,
      esImagen: documento.esImagen(),
      esPDF: documento.esPDF(),
      fechaSubida: documento.createdAt,
      observaciones: documento.observaciones,
      usuario: documento.usuario,
      postulacion: documento.postulacion,
      url: `/api/v1/documents/${documento.id}`,
      urlDescarga: `/api/v1/documents/${documento.id}?download=true`
    };

    return sendSuccess(res, metadata, 'Metadata del documento obtenida exitosamente', 200);

  } catch (error) {
    console.error('Error al obtener metadata del documento:', error);
    return sendError(res, `Error al obtener metadata: ${error.message}`, 500);
  }
};


/**
 * Listar documentos de una postulación (PÚBLICO - sin autenticación)
 * GET /api/v1/documents/public/postulacion/:postulacionId
 */
const getDocumentosByPostulacionPublic = async (req, res) => {
  try {
    const { postulacionId } = req.params;

    // Buscar postulación (solo para verificar que existe)
    const postulacion = await Postulacion.findByPk(postulacionId);

    if (!postulacion) {
      return sendError(res, MENSAJES_ERROR.POSTULACION_NO_ENCONTRADA, 404);
    }

    // Buscar documentos de la postulación
    const documentos = await Documento.findAll({
      where: {
        postulacionId,
        activo: true
      },
      order: [['createdAt', 'DESC']]
    });

    // Formatear respuesta con metadata completa incluyendo URLs
    const documentosFormateados = documentos.map(doc => ({
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      nombreOriginal: doc.nombreOriginal,
      tamano: doc.getTamanoLegible(),
      tamanoBytes: doc.tamanoBytes,
      mimeType: doc.mimeType,
      extension: doc.extension,
      fechaSubida: doc.createdAt,
      url: `/api/v1/documents/${doc.id}`,
      urlDescarga: `/api/v1/documents/${doc.id}?download=true`
    }));

    return sendSuccess(res, {
      postulacionId,
      total: documentosFormateados.length,
      documentos: documentosFormateados
    }, 'Documentos obtenidos exitosamente', 200);

  } catch (error) {
    console.error('Error al obtener documentos de postulación pública:', error);
    return sendError(res, `Error al obtener documentos: ${error.message}`, 500);
  }
};

module.exports = {
  uploadDocumento,
  getDocumento,
  deleteDocumento,
  getDocumentosByPostulacion,
  getDocumentosByPostulacionPublic,
  getMisDocumentos,
  getDocumentoMetadata
};
