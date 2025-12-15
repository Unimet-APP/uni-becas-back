const { DataTypes } = require('sequelize');
const path = require('path');

module.exports = (sequelize) => {
  const Documento = sequelize.define('Documento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Usuario dueño del documento (null para documentos del sistema)'
    },
    postulacionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Postulación asociada al documento (si aplica)'
    },
    esDocumentoSistema: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el documento pertenece al sistema (accesible por todos)'
    },
    cargadoPor: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del admin/gestor que cargó el documento del sistema (solo para docs del sistema)'
    },
    tipoDocumento: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      },
      comment: 'Tipo de documento - acepta cualquier valor descriptivo del frontend'
    },
    nombreOriginal: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      },
      comment: 'Nombre original del archivo subido'
    },
    nombreEncriptado: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Nombre encriptado del archivo en el servidor (UUID + extensión)'
    },
    rutaArchivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Ruta completa del archivo en el sistema de archivos'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        isValidMimeType(value) {
          const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png'
          ];
          if (!allowedMimeTypes.includes(value)) {
            throw new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedMimeTypes.join(', ')}`);
          }
        }
      }
    },
    extension: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        isValidExtension(value) {
          const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
          if (!allowedExtensions.includes(value.toLowerCase())) {
            throw new Error(`Extensión no permitida. Solo se permiten: ${allowedExtensions.join(', ')}`);
          }
        }
      }
    },
    tamanoBytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 10485760, // 10MB en bytes
        esNumeroPositivo(value) {
          if (value <= 0) {
            throw new Error('El tamaño del archivo debe ser mayor a 0');
          }
        }
      },
      comment: 'Tamaño del archivo en bytes'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Indica si el documento está activo (soft delete)'
    },
    eliminadoPor: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del usuario que eliminó el documento (si aplica)'
    },
    fechaEliminacion: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que se eliminó el documento'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones adicionales sobre el documento'
    }
  }, {
    tableName: 'documentos',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    paranoid: false,
    hooks: {
      beforeValidate: (documento) => {
        // Sanitizar nombre original del archivo (prevenir Path Traversal)
        if (documento.nombreOriginal) {
          // Remover caracteres peligrosos: ../, ..\, null bytes, etc.
          documento.nombreOriginal = documento.nombreOriginal
            .replace(/\.\./g, '') // Remover ..
            .replace(/[\/\\]/g, '_') // Reemplazar / y \ con _
            .replace(/\0/g, '') // Remover null bytes
            .replace(/[<>:"|?*]/g, '') // Remover caracteres no permitidos en Windows
            .trim()
            .substring(0, 255); // Limitar a 255 caracteres
        }

        // Normalizar extensión a minúsculas
        if (documento.extension) {
          documento.extension = documento.extension.toLowerCase();
        }

        // Normalizar mimeType
        if (documento.mimeType) {
          documento.mimeType = documento.mimeType.toLowerCase();
        }

        // Validaciones para documentos del sistema
        if (documento.esDocumentoSistema) {
          // Documentos del sistema NO deben tener usuarioId ni postulacionId
          if (documento.usuarioId !== null) {
            throw new Error('Documentos del sistema no pueden tener usuarioId');
          }
          if (documento.postulacionId !== null) {
            throw new Error('Documentos del sistema no pueden tener postulacionId');
          }
          // Documentos del sistema DEBEN tener cargadoPor
          if (!documento.cargadoPor) {
            throw new Error('Documentos del sistema deben especificar quién los cargó (cargadoPor)');
          }
        } else {
          // Documentos personales DEBEN tener usuarioId O postulacionId
          // Esto permite documentos de postulaciones públicas (sin usuario) vinculados por postulacionId
          if (!documento.usuarioId && !documento.postulacionId) {
            throw new Error('Documentos personales deben tener usuarioId o postulacionId');
          }
          // Documentos personales NO deben tener cargadoPor
          if (documento.cargadoPor) {
            throw new Error('Solo documentos del sistema pueden tener cargadoPor');
          }
        }
      },
      beforeDestroy: async (documento) => {
        // Soft delete: marcar como inactivo en lugar de eliminar
        documento.activo = false;
        documento.fechaEliminacion = new Date();
        await documento.save();

        // Lanzar error para cancelar el destroy y mantener el registro
        throw new Error('SOFT_DELETE_INTERCEPTED');
      }
    },
    indexes: [
      {
        fields: ['usuarioId']
      },
      {
        fields: ['postulacionId']
      },
      {
        fields: ['tipoDocumento']
      },
      {
        fields: ['activo']
      },
      {
        fields: ['esDocumentoSistema']
      },
      {
        fields: ['cargadoPor']
      },
      {
        fields: ['nombreEncriptado'],
        unique: true
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Definir asociaciones
  Documento.associate = (models) => {
    // Un documento puede pertenecer a un usuario (null para documentos del sistema)
    Documento.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
      constraints: false // Permitir null para documentos del sistema
    });

    // Un documento puede pertenecer a una postulación
    Documento.belongsTo(models.Postulacion, {
      foreignKey: 'postulacionId',
      as: 'postulacion'
    });

    // Un documento puede haber sido eliminado por un usuario
    Documento.belongsTo(models.Usuario, {
      foreignKey: 'eliminadoPor',
      as: 'eliminador'
    });

    // Un documento del sistema fue cargado por un admin/gestor
    Documento.belongsTo(models.Usuario, {
      foreignKey: 'cargadoPor',
      as: 'cargador'
    });
  };

  // Métodos de instancia
  Documento.prototype.esImagen = function() {
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(this.mimeType);
  };

  Documento.prototype.esPDF = function() {
    return this.mimeType === 'application/pdf';
  };

  Documento.prototype.getTamanoLegible = function() {
    const bytes = this.tamanoBytes;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const decimales = 2;
    const tamaños = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimales)) + ' ' + tamaños[i];
  };

  Documento.prototype.softDelete = async function(eliminadoPorId) {
    this.activo = false;
    this.eliminadoPor = eliminadoPorId;
    this.fechaEliminacion = new Date();
    return this.save();
  };

  Documento.prototype.puedeSerEliminadoPor = function(usuarioId, userRole) {
    // Documentos del sistema solo pueden ser eliminados por admin
    if (this.esDocumentoSistema) {
      return userRole === 'admin';
    }
    // El dueño del documento puede eliminarlo
    if (this.usuarioId === usuarioId) {
      return true;
    }
    // También pueden eliminarlo admins y gestores (validar en el controlador)
    return ['admin', 'gestor-becas'].includes(userRole);
  };

  Documento.prototype.puedeSerVistoPor = function(usuarioId, userRole) {
    // Documentos del sistema son visibles por todos los usuarios autenticados
    if (this.esDocumentoSistema) {
      return true;
    }
    // El dueño siempre puede ver
    if (this.usuarioId === usuarioId) {
      return true;
    }
    // Admins y gestores pueden ver todos
    if (['admin', 'director-area', 'capital-humano', 'gestor-becas'].includes(userRole)) {
      return true;
    }
    // Supervisores pueden ver documentos de sus ayudantes (validar en controlador)
    return false;
  };

  // Métodos estáticos
  Documento.getDocumentosActivos = async function(filtros = {}) {
    return this.findAll({
      where: {
        activo: true,
        ...filtros
      },
      order: [['createdAt', 'DESC']]
    });
  };

  Documento.getDocumentosPorPostulacion = async function(postulacionId) {
    return this.findAll({
      where: {
        postulacionId,
        activo: true
      },
      order: [['tipoDocumento', 'ASC']]
    });
  };

  Documento.getDocumentosPorUsuario = async function(usuarioId) {
    return this.findAll({
      where: {
        usuarioId,
        activo: true
      },
      order: [['createdAt', 'DESC']]
    });
  };

  Documento.getDocumentosSistema = async function(filtros = {}) {
    return this.findAll({
      where: {
        esDocumentoSistema: true,
        activo: true,
        ...filtros
      },
      order: [['tipoDocumento', 'ASC'], ['createdAt', 'DESC']]
    });
  };

  Documento.getDocumentoSistemaPorTipo = async function(tipo) {
    return this.findOne({
      where: {
        esDocumentoSistema: true,
        tipoDocumento: tipo,
        activo: true
      },
      order: [['createdAt', 'DESC']]
    });
  };

  return Documento;
};
