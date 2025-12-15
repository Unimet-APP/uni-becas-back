const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { VALIDACIONES, MENSAJES_ERROR } = require('../config/constants');

// Función para generar UUID v4 usando crypto nativo
const uuidv4 = () => {
  return crypto.randomUUID();
};

// Configurar la carpeta de uploads
const uploadPath = process.env.UPLOAD_PATH || './uploads';

// Crear carpeta de uploads si no existe
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configuración de almacenamiento con Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crear carpeta específica por año y mes para mejor organización
    const fecha = new Date();
    const ano = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const destPath = path.join(uploadPath, String(ano), mes);

    // Crear carpeta si no existe
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con UUID + extensión original
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreEncriptado = `${uuidv4()}${ext}`;

    // Guardar info del archivo en req para uso posterior
    req.archivoInfo = {
      nombreOriginal: file.originalname,
      nombreEncriptado,
      extension: ext
    };

    cb(null, nombreEncriptado);
  }
});

// Función de filtrado de archivos
const fileFilter = (req, file, cb) => {
  // Validar MIME type
  const allowedMimeTypes = VALIDACIONES.ALLOWED_FILE_TYPES;
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedMimeTypes.join(', ')}`),
      false
    );
  }

  // Validar extensión
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = VALIDACIONES.ALLOWED_FILE_EXTENSIONS;
  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Extensión de archivo no permitida. Solo se permiten: ${allowedExtensions.join(', ')}`),
      false
    );
  }

  // Validar nombre de archivo (no debe contener caracteres peligrosos)
  const nombreSanitizado = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (nombreSanitizado !== file.originalname) {
    file.originalname = nombreSanitizado;
  }

  cb(null, true);
};

// Configurar multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: VALIDACIONES.MAX_FILE_SIZE, // 5MB según constants.js
    files: 1 // Solo un archivo a la vez
  },
  fileFilter: fileFilter
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Error de Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'ARCHIVO_DEMASIADO_GRANDE',
        message: `El archivo excede el tamaño máximo permitido de ${VALIDACIONES.MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'DEMASIADOS_ARCHIVOS',
        message: 'Solo se permite subir un archivo a la vez'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'CAMPO_INESPERADO',
        message: 'Campo de archivo inesperado. Use el campo "file"'
      });
    }

    return res.status(400).json({
      success: false,
      error: 'ERROR_UPLOAD',
      message: `Error al subir archivo: ${err.message}`
    });
  }

  if (err) {
    // Error personalizado (de fileFilter u otro)
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_INVALIDO',
      message: err.message
    });
  }

  next();
};

// Middleware para validar que se haya subido un archivo
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_REQUERIDO',
      message: 'Debe subir un archivo'
    });
  }
  next();
};

// MIDDLEWARE DESHABILITADO: Validación de tipo de documento removida
// Los administradores pueden subir cualquier tipo de documento sin restricciones
// Comentado el 2025-11-15 para permitir flexibilidad en tipos de documento
/*
const validateTipoDocumento = (req, res, next) => {
  const tiposValidos = [
    'cedula',
    'historico_notas',
    'flujograma_carrera',
    'plan_carrera_avalado',
    'curriculum',
    'carta_motivacion',
    'certificados_logros',
    'constancia_laboral',
    'comprobante_ingresos',
    'reglamento',
    'otro'
  ];

  const tipoDocumento = req.body.tipoDocumento;

  if (!tipoDocumento) {
    return res.status(400).json({
      success: false,
      error: 'TIPO_DOCUMENTO_REQUERIDO',
      message: 'Debe especificar el tipo de documento'
    });
  }

  if (!tiposValidos.includes(tipoDocumento)) {
    return res.status(400).json({
      success: false,
      error: 'TIPO_DOCUMENTO_INVALIDO',
      message: `Tipo de documento inválido. Valores permitidos: ${tiposValidos.join(', ')}`
    });
  }

  next();
};
*/

// Función auxiliar para eliminar archivo físico
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        // Si el archivo no existe, no es un error crítico
        if (err.code === 'ENOENT') {
          console.warn(`Archivo no encontrado para eliminar: ${filePath}`);
          return resolve();
        }
        return reject(err);
      }
      resolve();
    });
  });
};

// Función auxiliar para verificar si un archivo existe
const fileExists = (filePath) => {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};

// Función auxiliar para obtener tamaño de archivo
const getFileSize = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return reject(err);
      resolve(stats.size);
    });
  });
};

module.exports = {
  upload,
  handleMulterError,
  validateFileUpload,
  // validateTipoDocumento, // Removido - ya no se valida tipo de documento
  deleteFile,
  fileExists,
  getFileSize,
  uploadPath
};
