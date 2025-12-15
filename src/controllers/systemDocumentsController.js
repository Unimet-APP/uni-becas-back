const path = require('path');
const { Documento, Usuario, sequelize } = require('../models');
const { deleteFile } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../config/responses');

/**
 * Listar todos los documentos del sistema
 * GET /api/v1/documents/sistema
 */
const getDocumentosSistema = async (req, res) => {
  try {
    // Buscar todos los documentos del sistema activos
    const documentos = await Documento.getDocumentosSistema();

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
      url: `/api/v1/documents/${doc.id}`,
      urlDescarga: `/api/v1/documents/${doc.id}?download=true`
    }));

    return sendSuccess(res, {
      total: documentosFormateados.length,
      documentos: documentosFormateados
    }, 'Documentos del sistema obtenidos exitosamente', 200);

  } catch (error) {
    console.error('Error al obtener documentos del sistema:', error);
    return sendError(res, `Error al obtener documentos del sistema: ${error.message}`, 500);
  }
};

/**
 * Obtener documento del sistema por tipo
 * GET /api/v1/documents/sistema/tipo/:tipo
 */
const getDocumentoSistemaPorTipo = async (req, res) => {
  try {
    const { tipo } = req.params;

    // Validación de tipo de documento removida - se permite cualquier tipo

    // Buscar documento del sistema por tipo
    const documento = await Documento.getDocumentoSistemaPorTipo(tipo);

    if (!documento) {
      return sendError(res, `No se encontró un documento del sistema de tipo '${tipo}'`, 404);
    }

    // Formatear respuesta
    const documentoFormateado = {
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
      url: `/api/v1/documents/${documento.id}`,
      urlDescarga: `/api/v1/documents/${documento.id}?download=true`
    };

    return sendSuccess(res, documentoFormateado, `Documento del sistema '${tipo}' obtenido exitosamente`, 200);

  } catch (error) {
    console.error('Error al obtener documento del sistema por tipo:', error);
    return sendError(res, `Error al obtener documento del sistema: ${error.message}`, 500);
  }
};

/**
 * Subir un documento del sistema
 * POST /api/v1/documents/sistema/upload
 * Requiere rol: admin o gestor-becas
 */
const uploadDocumentoSistema = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Validar que se haya subido un archivo
    if (!req.file) {
      return sendError(res, 'Debe subir un archivo', 400);
    }

    const { tipoDocumento, observaciones } = req.body;
    const cargadoPor = req.user.id;
    const userRole = req.user.role;

    // Validar permisos: solo admin y gestor-becas pueden subir documentos del sistema
    if (!['admin', 'gestor-becas'].includes(userRole)) {
      await deleteFile(req.file.path);
      return sendError(res, 'Solo administradores y gestores de becas pueden subir documentos del sistema', 403);
    }

    // Verificar si ya existe un documento del sistema de este tipo
    const documentoExistente = await Documento.findOne({
      where: {
        esDocumentoSistema: true,
        tipoDocumento,
        activo: true
      },
      transaction
    });

    if (documentoExistente) {
      await deleteFile(req.file.path);
      await transaction.rollback();
      return sendError(
        res,
        `Ya existe un documento del sistema de tipo '${tipoDocumento}'. Elimínelo primero si desea reemplazarlo.`,
        409
      );
    }

    // Crear registro en base de datos
    const documento = await Documento.create({
      usuarioId: null, // Documentos del sistema no tienen dueño
      postulacionId: null,
      esDocumentoSistema: true,
      cargadoPor,
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

    await transaction.commit();

    return sendSuccess(res, {
      id: documento.id,
      tipoDocumento: documento.tipoDocumento,
      nombreOriginal: documento.nombreOriginal,
      tamano: documento.getTamanoLegible(),
      fechaSubida: documento.createdAt,
      url: `/api/v1/documents/${documento.id}`
    }, 'Documento del sistema subido exitosamente', 201);

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

    console.error('Error al subir documento del sistema:', error);
    return sendError(res, `Error al subir documento del sistema: ${error.message}`, 500);
  }
};

/**
 * Eliminar un documento del sistema
 * DELETE /api/v1/documents/sistema/:id
 * Requiere rol: admin
 */
const deleteDocumentoSistema = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;

    // Validar permisos: solo admin puede eliminar documentos del sistema
    if (usuarioRole !== 'admin') {
      await transaction.rollback();
      return sendError(res, 'Solo administradores pueden eliminar documentos del sistema', 403);
    }

    // Buscar documento
    const documento = await Documento.findOne({
      where: {
        id,
        esDocumentoSistema: true,
        activo: true
      },
      transaction
    });

    if (!documento) {
      await transaction.rollback();
      return sendError(res, 'Documento del sistema no encontrado', 404);
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

    return sendSuccess(res, null, 'Documento del sistema eliminado exitosamente', 200);

  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar documento del sistema:', error);
    return sendError(res, `Error al eliminar documento del sistema: ${error.message}`, 500);
  }
};

module.exports = {
  getDocumentosSistema,
  getDocumentoSistemaPorTipo,
  uploadDocumentoSistema,
  deleteDocumentoSistema
};
