const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReporteActividad = sequelize.define('ReporteActividad', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    estudianteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    estudianteBecarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'estudiantes_becarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    supervisorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    tipoBeca: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago']]
      }
    },
    // Identificación temporal
    semana: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12, // Trimestre tiene 12 semanas
        isInt: true
      }
    },
    periodoAcademico: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 10]
      }
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
        noFuturo(value) {
          if (value) {
            const hoy = new Date();
            const fechaReporte = new Date(value);
            if (fechaReporte > hoy) {
              throw new Error('La fecha del reporte no puede ser futura');
            }
          }
        }
      }
    },
    // Campos de contenido del reporte semanal
    horasTrabajadas: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0.5, // Mínimo 30 minutos
        max: 50,  // Máximo 50 horas por semana (10h x 5 días)
        isDecimal: true
      }
    },
    objetivosPeriodo: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    metasEspecificas: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    actividadesProgramadas: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    actividadesRealizadas: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    descripcionActividades: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    // Control de estado y aprobación
    estado: {
      type: DataTypes.ENUM(
        'Pendiente',
        'Aprobada',
        'Rechazada',
        'En Revisión'
      ),
      allowNull: false,
      defaultValue: 'Pendiente',
      validate: {
        notEmpty: true
      }
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Si es true, solo admins pueden editar el reporte'
    },
    fechaAprobacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observacionesSupervisor: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000]
      }
    },
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000]
      }
    }
  }, {
    tableName: 'reportes_actividad',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeUpdate: (reporte) => {
        // Si cambia el estado a Aprobada o Rechazada, establecer fecha
        if (reporte.changed('estado') &&
            ['Aprobada', 'Rechazada'].includes(reporte.estado)) {
          reporte.fechaAprobacion = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['estudianteId']
      },
      {
        fields: ['estudianteBecarioId']
      },
      {
        fields: ['supervisorId']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['tipoBeca']
      },
      {
        fields: ['periodoAcademico']
      },
      {
        fields: ['semana']
      },
      {
        fields: ['fechaAprobacion']
      },
      {
        // Índice compuesto para búsqueda rápida (NO único - permite múltiples reportes por semana)
        // Esto permite crear nuevos reportes cuando el anterior fue rechazado
        fields: ['estudianteBecarioId', 'periodoAcademico', 'semana'],
        name: 'idx_reporte_semana'
      }
    ]
  });

  // Definir asociaciones
  ReporteActividad.associate = (models) => {
    // Un reporte pertenece a un estudiante
    ReporteActividad.belongsTo(models.Usuario, {
      foreignKey: 'estudianteId',
      as: 'estudiante'
    });

    // Un reporte pertenece a un estudiante becario
    ReporteActividad.belongsTo(models.EstudianteBecario, {
      foreignKey: 'estudianteBecarioId',
      as: 'estudianteBecario'
    });

    // Un reporte puede ser aprobado por un supervisor
    ReporteActividad.belongsTo(models.Usuario, {
      foreignKey: 'supervisorId',
      as: 'supervisor'
    });
  };

  // Métodos de instancia
  ReporteActividad.prototype.puedeSerAprobado = function() {
    return ['Pendiente', 'En Revisión'].includes(this.estado);
  };

  ReporteActividad.prototype.puedeSerRechazado = function() {
    return ['Pendiente', 'En Revisión'].includes(this.estado);
  };

  ReporteActividad.prototype.puedeSerEditado = function(isAdmin = false) {
    // Si es admin, siempre puede editar
    if (isAdmin) return true;

    // Si está bloqueado y no es admin, no puede editar
    if (this.bloqueado) return false;

    // Si no está bloqueado, solo puede editar si está pendiente
    return this.estado === 'Pendiente';
  };

  ReporteActividad.prototype.aprobar = function(supervisorId, observaciones = null) {
    if (!this.puedeSerAprobado()) {
      throw new Error('Este reporte no puede ser aprobado en su estado actual');
    }

    this.estado = 'Aprobada';
    this.supervisorId = supervisorId;
    this.fechaAprobacion = new Date();

    if (observaciones) {
      this.observacionesSupervisor = observaciones;
    }

    return this.save();
  };

  ReporteActividad.prototype.rechazar = function(supervisorId, motivo) {
    if (!this.puedeSerRechazado()) {
      throw new Error('Este reporte no puede ser rechazado en su estado actual');
    }

    if (!motivo) {
      throw new Error('El motivo de rechazo es requerido');
    }

    this.estado = 'Rechazada';
    this.supervisorId = supervisorId;
    this.fechaAprobacion = new Date();
    this.motivoRechazo = motivo;

    return this.save();
  };

  ReporteActividad.prototype.enviarARevision = function() {
    if (this.estado === 'Pendiente') {
      this.estado = 'En Revisión';
      return this.save();
    }
    throw new Error('Solo se pueden enviar a revisión reportes pendientes');
  };

  ReporteActividad.prototype.bloquear = function() {
    this.bloqueado = true;
    return this.save();
  };

  ReporteActividad.prototype.desbloquear = function() {
    this.bloqueado = false;
    return this.save();
  };

  // Métodos estáticos
  ReporteActividad.findPendientesPorSupervisor = function(supervisorId) {
    return this.findAll({
      where: {
        supervisorId,
        estado: ['Pendiente', 'En Revisión']
      },
      order: [['semana', 'ASC']]
    });
  };

  ReporteActividad.findPorEstudiante = function(estudianteId, periodoAcademico = null) {
    const where = { estudianteId };

    if (periodoAcademico) {
      where.periodoAcademico = periodoAcademico;
    }

    return this.findAll({
      where,
      order: [['semana', 'DESC']]
    });
  };

  ReporteActividad.findPorBecario = function(estudianteBecarioId, periodoAcademico = null) {
    const where = { estudianteBecarioId };

    if (periodoAcademico) {
      where.periodoAcademico = periodoAcademico;
    }

    return this.findAll({
      where,
      order: [['semana', 'ASC']]
    });
  };

  ReporteActividad.findBySemana = function(estudianteBecarioId, periodoAcademico, semana) {
    return this.findOne({
      where: {
        estudianteBecarioId,
        periodoAcademico,
        semana
      }
    });
  };

  ReporteActividad.calcularHorasTotales = function(estudianteBecarioId, periodoAcademico, estado = 'Aprobada') {
    const whereClause = {
      estudianteBecarioId,
      estado
    };

    // Solo filtrar por período si se especifica uno
    if (periodoAcademico) {
      whereClause.periodoAcademico = periodoAcademico;
    }

    return this.sum('horasTrabajadas', {
      where: whereClause
    });
  };

  ReporteActividad.findPorPeriodo = function(periodoAcademico) {
    return this.findAll({
      where: { periodoAcademico },
      order: [['semana', 'ASC']]
    });
  };

  ReporteActividad.estadisticasPorSemana = function(periodoAcademico = null) {
    const where = periodoAcademico ? { periodoAcademico } : {};

    return this.findAll({
      attributes: [
        'semana',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'cantidadReportes'],
        [sequelize.Sequelize.fn('SUM', sequelize.Sequelize.col('horasTrabajadas')), 'totalHoras'],
        [sequelize.Sequelize.fn('AVG', sequelize.Sequelize.col('horasTrabajadas')), 'promedioHoras']
      ],
      where,
      group: ['semana'],
      order: [['semana', 'ASC']],
      raw: true
    });
  };

  return ReporteActividad;
};
