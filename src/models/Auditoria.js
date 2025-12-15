const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Auditoria = sequelize.define('Auditoria', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    accion: {
      type: DataTypes.ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'APPROVE',
        'REJECT',
        'ASSIGN',
        'UNASSIGN',
        'UPLOAD',
        'DOWNLOAD',
        'EXPORT',
        'IMPORT'
      ),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    entidad: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    entidadId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    datosAnteriores: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    datosNuevos: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: true
      }
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadatos: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    exitoso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    mensajeError: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'auditoria',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false, // No actualizar registros de auditoría
    hooks: {
      beforeValidate: (auditoria) => {
        // Sanitizar descripción para prevenir XSS
        if (auditoria.descripcion) {
          auditoria.descripcion = auditoria.descripcion
            .replace(/<[^>]*>/g, '') // Remover HTML tags
            .trim()
            .substring(0, 5000); // Limitar longitud
        }

        // Sanitizar mensaje de error
        if (auditoria.mensajeError) {
          auditoria.mensajeError = auditoria.mensajeError
            .replace(/<[^>]*>/g, '')
            .trim()
            .substring(0, 2000);
        }

        // Sanitizar user agent
        if (auditoria.userAgent) {
          auditoria.userAgent = auditoria.userAgent
            .replace(/<[^>]*>/g, '')
            .trim()
            .substring(0, 500);
        }
      }
    },
    indexes: [
      {
        fields: ['usuarioId']
      },
      {
        fields: ['accion']
      },
      {
        fields: ['entidad']
      },
      {
        fields: ['entidadId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['exitoso']
      },
      {
        fields: ['ipAddress']
      },
      {
        // Índice compuesto para búsquedas comunes
        fields: ['entidad', 'entidadId', 'createdAt']
      },
      {
        // Índice compuesto para búsqueda por usuario y fecha
        fields: ['usuarioId', 'createdAt']
      }
    ]
  });

  // Definir asociaciones
  Auditoria.associate = (models) => {
    // Una auditoría pertenece a un usuario (puede ser null para acciones del sistema)
    Auditoria.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
      constraints: false
    });
  };

  // Métodos estáticos

  /**
   * Registrar una acción de auditoría
   * @param {Object} datos - Datos de la auditoría
   * @param {String} datos.usuarioId - ID del usuario (opcional)
   * @param {String} datos.accion - Tipo de acción (CREATE, UPDATE, etc.)
   * @param {String} datos.entidad - Nombre de la entidad
   * @param {String} datos.entidadId - ID del registro afectado
   * @param {String} datos.descripcion - Descripción de la acción
   * @param {Object} datos.datosAnteriores - Estado anterior (opcional)
   * @param {Object} datos.datosNuevos - Estado nuevo (opcional)
   * @param {String} datos.ipAddress - Dirección IP (opcional)
   * @param {String} datos.userAgent - User agent (opcional)
   * @param {Object} datos.metadatos - Metadatos adicionales (opcional)
   * @param {Boolean} datos.exitoso - Si la acción fue exitosa (default: true)
   * @param {String} datos.mensajeError - Mensaje de error (opcional)
   */
  Auditoria.registrar = async function(datos) {
    try {
      return await this.create({
        usuarioId: datos.usuarioId || null,
        accion: datos.accion,
        entidad: datos.entidad,
        entidadId: datos.entidadId || null,
        descripcion: datos.descripcion,
        datosAnteriores: datos.datosAnteriores || null,
        datosNuevos: datos.datosNuevos || null,
        ipAddress: datos.ipAddress || null,
        userAgent: datos.userAgent || null,
        metadatos: datos.metadatos || {},
        exitoso: datos.exitoso !== undefined ? datos.exitoso : true,
        mensajeError: datos.mensajeError || null
      });
    } catch (error) {
      // Si falla el registro de auditoría, no queremos que falle la operación principal
      // Solo logueamos el error
      console.error('Error al registrar auditoría:', error);
      return null;
    }
  };

  /**
   * Obtener auditorías de un usuario específico
   */
  Auditoria.getPorUsuario = async function(usuarioId, opciones = {}) {
    const {
      limit = 50,
      offset = 0,
      accion = null,
      entidad = null,
      fechaDesde = null,
      fechaHasta = null
    } = opciones;

    const whereClause = { usuarioId };

    if (accion) whereClause.accion = accion;
    if (entidad) whereClause.entidad = entidad;

    if (fechaDesde || fechaHasta) {
      whereClause.createdAt = {};
      if (fechaDesde) whereClause.createdAt[sequelize.Sequelize.Op.gte] = fechaDesde;
      if (fechaHasta) whereClause.createdAt[sequelize.Sequelize.Op.lte] = fechaHasta;
    }

    return await this.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });
  };

  /**
   * Obtener auditorías de una entidad específica
   */
  Auditoria.getPorEntidad = async function(entidad, entidadId, opciones = {}) {
    const { limit = 50, offset = 0 } = opciones;

    return await this.findAll({
      where: {
        entidad,
        entidadId
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });
  };

  /**
   * Obtener auditorías recientes
   */
  Auditoria.getRecientes = async function(opciones = {}) {
    const { limit = 100, offset = 0, entidad = null, accion = null } = opciones;

    const whereClause = {};
    if (entidad) whereClause.entidad = entidad;
    if (accion) whereClause.accion = accion;

    return await this.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });
  };

  /**
   * Obtener auditorías fallidas (para análisis de errores)
   */
  Auditoria.getFallidas = async function(opciones = {}) {
    const { limit = 50, offset = 0, fechaDesde = null } = opciones;

    const whereClause = { exitoso: false };

    if (fechaDesde) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.gte]: fechaDesde
      };
    }

    return await this.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: sequelize.models.Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });
  };

  /**
   * Obtener estadísticas de auditoría
   */
  Auditoria.getEstadisticas = async function(fechaDesde, fechaHasta) {
    const whereClause = {};

    if (fechaDesde || fechaHasta) {
      whereClause.createdAt = {};
      if (fechaDesde) whereClause.createdAt[sequelize.Sequelize.Op.gte] = fechaDesde;
      if (fechaHasta) whereClause.createdAt[sequelize.Sequelize.Op.lte] = fechaHasta;
    }

    const [totalAcciones, accionesPorTipo, accionesPorEntidad, accionesFallidas] = await Promise.all([
      // Total de acciones
      this.count({ where: whereClause }),

      // Acciones por tipo
      this.findAll({
        where: whereClause,
        attributes: [
          'accion',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['accion'],
        raw: true
      }),

      // Acciones por entidad
      this.findAll({
        where: whereClause,
        attributes: [
          'entidad',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['entidad'],
        raw: true
      }),

      // Acciones fallidas
      this.count({
        where: {
          ...whereClause,
          exitoso: false
        }
      })
    ]);

    return {
      totalAcciones,
      accionesFallidas,
      accionesPorTipo,
      accionesPorEntidad,
      tasaExito: totalAcciones > 0 ? ((totalAcciones - accionesFallidas) / totalAcciones * 100).toFixed(2) : 100
    };
  };

  /**
   * Limpiar auditorías antiguas (para mantenimiento de la base de datos)
   * @param {Number} diasAntiguedad - Días de antigüedad para considerar las auditorías como antiguas
   */
  Auditoria.limpiarAntiguas = async function(diasAntiguedad = 2555) {
    // Por defecto 2555 días = 7 años (según requisitos del proyecto)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const registrosEliminados = await this.destroy({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.lt]: fechaLimite
        }
      }
    });

    return registrosEliminados;
  };

  return Auditoria;
};
