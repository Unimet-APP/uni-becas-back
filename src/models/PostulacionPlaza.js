const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostulacionPlaza = sequelize.define('PostulacionPlaza', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    estudianteBecarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'estudiantes_becarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID del estudiante becario que postula'
    },
    plazaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plazas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID de la plaza a la que se postula'
    },
    estado: {
      type: DataTypes.ENUM(
        'Pendiente',
        'Aprobada',
        'Rechazada'
      ),
      allowNull: false,
      defaultValue: 'Pendiente',
      validate: {
        notEmpty: true,
        isIn: [['Pendiente', 'Aprobada', 'Rechazada']]
      }
    },
    fechaPostulacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha en que el estudiante postula a la plaza'
    },
    fechaRespuesta: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que el admin aprueba o rechaza la postulación'
    },
    respondidoPor: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID del admin que respondió la postulación'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observaciones generales sobre la postulación'
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo detallado del rechazo (si aplica)'
    },
    compatibilidadHoraria: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Información de compatibilidad horaria calculada al momento de postular. Formato: { esCompatible, bloques, porcentaje, detalles }'
    }
  }, {
    tableName: 'postulaciones_plazas',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeUpdate: (postulacion) => {
        // Establecer fecha de respuesta cuando cambia de Pendiente a otro estado
        if (postulacion.changed('estado') && postulacion.estado !== 'Pendiente' && !postulacion.fechaRespuesta) {
          postulacion.fechaRespuesta = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['estudianteBecarioId'],
        comment: 'Índice para búsquedas por becario'
      },
      {
        fields: ['plazaId'],
        comment: 'Índice para búsquedas por plaza'
      },
      {
        fields: ['estado'],
        comment: 'Índice para filtrar por estado'
      },
      {
        fields: ['fechaPostulacion'],
        comment: 'Índice para ordenar por fecha'
      },
      {
        // Constraint único: Un becario solo puede tener UNA postulación pendiente a la vez
        unique: true,
        fields: ['estudianteBecarioId'],
        where: {
          estado: 'Pendiente'
        },
        name: 'unique_postulacion_pendiente_por_becario',
        comment: 'Garantiza que un becario solo tenga una postulación pendiente a la vez'
      },
      {
        // Prevenir postulaciones duplicadas a la misma plaza por el mismo becario
        unique: true,
        fields: ['estudianteBecarioId', 'plazaId', 'estado'],
        where: {
          estado: 'Pendiente'
        },
        name: 'unique_postulacion_plaza_becario',
        comment: 'Previene postulaciones duplicadas del mismo becario a la misma plaza'
      }
    ]
  });

  // Definir asociaciones
  PostulacionPlaza.associate = (models) => {
    // Una postulación pertenece a un estudiante becario
    PostulacionPlaza.belongsTo(models.EstudianteBecario, {
      foreignKey: 'estudianteBecarioId',
      as: 'estudianteBecario'
    });

    // Una postulación es para una plaza específica
    PostulacionPlaza.belongsTo(models.Plaza, {
      foreignKey: 'plazaId',
      as: 'plaza'
    });

    // Una postulación es respondida por un usuario (admin)
    PostulacionPlaza.belongsTo(models.Usuario, {
      foreignKey: 'respondidoPor',
      as: 'respondidoPorUsuario'
    });
  };

  // Métodos de instancia

  /**
   * Verificar si la postulación está pendiente
   * @returns {Boolean}
   */
  PostulacionPlaza.prototype.estaPendiente = function() {
    return this.estado === 'Pendiente';
  };

  /**
   * Verificar si la postulación fue aprobada
   * @returns {Boolean}
   */
  PostulacionPlaza.prototype.fueAprobada = function() {
    return this.estado === 'Aprobada';
  };

  /**
   * Verificar si la postulación fue rechazada
   * @returns {Boolean}
   */
  PostulacionPlaza.prototype.fueRechazada = function() {
    return this.estado === 'Rechazada';
  };

  /**
   * Aprobar postulación
   * @param {String} adminId - ID del admin que aprueba
   * @param {String} observaciones - Observaciones opcionales
   * @returns {Promise<PostulacionPlaza>}
   */
  PostulacionPlaza.prototype.aprobar = function(adminId, observaciones = null) {
    if (!this.estaPendiente()) {
      throw new Error('Solo se pueden aprobar postulaciones pendientes');
    }

    this.estado = 'Aprobada';
    this.fechaRespuesta = new Date();
    this.respondidoPor = adminId;
    if (observaciones) {
      this.observaciones = observaciones;
    }

    return this.save();
  };

  /**
   * Rechazar postulación
   * @param {String} adminId - ID del admin que rechaza
   * @param {String} motivoRechazo - Motivo del rechazo (requerido)
   * @param {String} observaciones - Observaciones adicionales
   * @returns {Promise<PostulacionPlaza>}
   */
  PostulacionPlaza.prototype.rechazar = function(adminId, motivoRechazo, observaciones = null) {
    if (!this.estaPendiente()) {
      throw new Error('Solo se pueden rechazar postulaciones pendientes');
    }

    if (!motivoRechazo || motivoRechazo.trim() === '') {
      throw new Error('El motivo de rechazo es requerido');
    }

    this.estado = 'Rechazada';
    this.fechaRespuesta = new Date();
    this.respondidoPor = adminId;
    this.motivoRechazo = motivoRechazo;
    if (observaciones) {
      this.observaciones = observaciones;
    }

    return this.save();
  };

  /**
   * Obtener días transcurridos desde la postulación
   * @returns {Number}
   */
  PostulacionPlaza.prototype.diasDesdePostulacion = function() {
    const ahora = new Date();
    const fechaPost = new Date(this.fechaPostulacion);
    const diffTime = Math.abs(ahora - fechaPost);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Verificar si la postulación está expirada (más de X días sin respuesta)
   * @param {Number} diasMaximos - Días máximos de espera (default: 7)
   * @returns {Boolean}
   */
  PostulacionPlaza.prototype.estaExpirada = function(diasMaximos = 7) {
    if (!this.estaPendiente()) {
      return false;
    }
    return this.diasDesdePostulacion() > diasMaximos;
  };

  /**
   * Obtener porcentaje de compatibilidad horaria
   * @returns {Number}
   */
  PostulacionPlaza.prototype.obtenerPorcentajeCompatibilidad = function() {
    if (!this.compatibilidadHoraria || !this.compatibilidadHoraria.porcentaje) {
      return 0;
    }
    return this.compatibilidadHoraria.porcentaje;
  };

  /**
   * Verificar si la compatibilidad horaria es alta (>= 80%)
   * @returns {Boolean}
   */
  PostulacionPlaza.prototype.tieneAltaCompatibilidad = function() {
    return this.obtenerPorcentajeCompatibilidad() >= 80;
  };

  return PostulacionPlaza;
};
