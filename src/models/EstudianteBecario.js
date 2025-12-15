const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EstudianteBecario = sequelize.define('EstudianteBecario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    postulacionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'postulaciones',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    tipoBeca: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente']]
      }
    },
    estado: {
      type: DataTypes.ENUM(
        'Activa',
        'Suspendida',
        'Culminada',
        'Incompleta',
        'Cancelada'
      ),
      allowNull: false,
      defaultValue: 'Activa',
      validate: {
        notEmpty: true
      }
    },
    periodoInicio: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 10]
      },
      comment: 'Período académico de inicio en formato "YYYY-T" donde T es el trimestre (1, 2, 3). Ejemplos: "2025-1", "2025-2", "2025-3"'
    },
    periodoFin: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        len: [5, 10]
      }
    },
    horasRequeridas: {
      type: DataTypes.INTEGER,
      allowNull: true, // Permitir null para becas que no sean Ayudantía
      validate: {
        isInt: true,
        horasSegunTipo(value) {
          // Solo validar para Beca Ayudantía
          if (this.tipoBeca === 'Ayudantía') {
            // Ayudantía DEBE tener horas definidas
            if (value === null || value === undefined) {
              throw new Error('Horas requeridas es obligatorio para Beca Ayudantía');
            }
            // Debe ser 60 (intensiva) o 120 (regular)
            if (value !== 120 && value !== 60) {
              throw new Error('Horas requeridas para Ayudantía deben ser 60 (intensiva) o 120 (regular)');
            }
          } else {
            // Becas que NO son Ayudantía no deben tener horas
            if (value !== null && value !== 0) {
              throw new Error('Solo Beca Ayudantía requiere horas definidas');
            }
          }
        }
      },
      comment: 'Horas requeridas para completar la beca (solo aplica para Beca Ayudantía: 60 o 120 horas)'
    },
    horasCompletadas: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Horas completadas por el estudiante becario (solo aplica para Beca Ayudantía)'
    },
    iaaActual: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 20
      }
    },
    plazaAsignada: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'plazas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    fechaAsignacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fechaCulminacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trimestresCursados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 1
      },
      comment: 'Número de trimestres cursados en este programa de beca'
    },
    motivoSuspension: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo de suspensión de la beca (si aplica)'
    },
    descuentoAplicado: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    evaluacionSatisfactoria: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    fechaEvaluacion: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'estudiantes_becarios',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeUpdate: async (estudianteBecario) => {
        // Si se completan las horas requeridas, cambiar estado a Culminada (solo para Ayudantía)
        if (estudianteBecario.horasRequeridas !== null &&
            estudianteBecario.horasRequeridas !== undefined &&
            estudianteBecario.horasCompletadas >= estudianteBecario.horasRequeridas &&
            estudianteBecario.estado === 'Activa') {
          estudianteBecario.estado = 'Culminada';
          estudianteBecario.fechaCulminacion = new Date();
        }

        // Aplicar descuento dinámicamente si la evaluación es satisfactoria
        if (estudianteBecario.evaluacionSatisfactoria === true) {
          const { ProgramaBeca } = require('./index');
          const programa = await ProgramaBeca.findOne({
            where: { nombre: estudianteBecario.tipoBeca, activo: true }
          });
          if (programa) {
            estudianteBecario.descuentoAplicado = programa.porcentajeDescuento;
          }
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['usuarioId']
      },
      {
        unique: true,
        fields: ['postulacionId']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['tipoBeca']
      },
      {
        fields: ['periodoInicio']
      },
      {
        fields: ['plazaAsignada']
      }
    ]
  });

  // Definir asociaciones
  EstudianteBecario.associate = (models) => {
    // Un estudiante becario pertenece a un usuario
    EstudianteBecario.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario'
    });

    // Un estudiante becario se origina de una postulación
    EstudianteBecario.belongsTo(models.Postulacion, {
      foreignKey: 'postulacionId',
      as: 'postulacion'
    });

    // Un estudiante becario puede estar asignado a una plaza
    EstudianteBecario.belongsTo(models.Plaza, {
      foreignKey: 'plazaAsignada',
      as: 'plaza'
    });

    // Un estudiante becario puede tener múltiples reportes de actividad
    EstudianteBecario.hasMany(models.ReporteActividad, {
      foreignKey: 'estudianteBecarioId',
      as: 'reportesActividad'
    });

    // Un estudiante becario puede tener múltiples postulaciones a plazas
    EstudianteBecario.hasMany(models.PostulacionPlaza, {
      foreignKey: 'estudianteBecarioId',
      as: 'postulacionesPlazas'
    });
  };

  // Métodos de instancia
  EstudianteBecario.prototype.calcularPorcentajeCompletado = function() {
    // Solo aplica para Beca Ayudantía
    if (this.horasRequeridas === null || this.horasRequeridas === undefined || this.horasRequeridas === 0) {
      return 0;
    }
    return Math.round((this.horasCompletadas / this.horasRequeridas) * 100);
  };

  EstudianteBecario.prototype.horasRestantes = function() {
    // Solo aplica para Beca Ayudantía
    if (this.horasRequeridas === null || this.horasRequeridas === undefined || this.horasRequeridas === 0) {
      return 0;
    }
    return Math.max(0, this.horasRequeridas - this.horasCompletadas);
  };

  EstudianteBecario.prototype.puedeRegistrarHoras = function() {
    // Solo aplica para Beca Ayudantía
    if (this.horasRequeridas === null || this.horasRequeridas === undefined || this.horasRequeridas === 0) {
      return false;
    }
    return this.estado === 'Activa' && this.horasCompletadas < this.horasRequeridas;
  };

  EstudianteBecario.prototype.esIntensivo = function() {
    return this.horasRequeridas === 60;
  };

  EstudianteBecario.prototype.esRegular = function() {
    return this.horasRequeridas === 120;
  };

  EstudianteBecario.prototype.puedeSerEvaluado = function() {
    if (this.estado !== 'Activa') return false;

    // Solo aplica para Beca Ayudantía
    if (this.horasRequeridas === null || this.horasRequeridas === undefined || this.horasRequeridas === 0) {
      return false;
    }

    const semanaEvaluacion = this.esIntensivo() ? 5 : 11;
    // Aquí podrías agregar lógica para calcular si estamos en la semana correcta
    // Por ahora, permitimos evaluación si tiene al menos el 80% de horas
    return this.calcularPorcentajeCompletado() >= 80;
  };

  EstudianteBecario.prototype.aplicarDescuento = function() {
    if (this.tipoBeca === 'Ayudantía' && this.evaluacionSatisfactoria) {
      this.descuentoAplicado = 25.00;
      return this.save();
    }
    return Promise.resolve(this);
  };

  EstudianteBecario.prototype.suspender = function(motivo) {
    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de suspensión es requerido');
    }
    this.estado = 'Suspendida';
    this.motivoSuspension = motivo;
    this.observaciones = `Suspendida: ${motivo}`;
    return this.save();
  };

  EstudianteBecario.prototype.reactivar = function() {
    if (this.estado === 'Suspendida') {
      this.estado = 'Activa';
      this.motivoSuspension = null;  // Limpiar el motivo de suspensión
      this.observaciones = this.observaciones ? this.observaciones + ' | Reactivada' : 'Reactivada';
      return this.save();
    }
    throw new Error('Solo se pueden reactivar becas suspendidas');
  };

  EstudianteBecario.prototype.culminar = function() {
    this.estado = 'Culminada';
    this.fechaCulminacion = new Date();
    return this.save();
  };

  EstudianteBecario.prototype.asignarPlaza = function(plazaId) {
    this.plazaAsignada = plazaId;
    this.fechaAsignacion = new Date();
    return this.save();
  };

  /**
   * Verificar compatibilidad de horarios con una plaza
   * @param {Object} plaza - Plaza con horario
   * @param {Object} options - Opciones adicionales (transaction, etc.)
   * @returns {Promise<Object>} - { esCompatible: Boolean, mensaje: String, detalles: Object }
   */
  EstudianteBecario.prototype.verificarCompatibilidadHorario = async function(plaza, options = {}) {
    if (!plaza || !plaza.horario) {
      return {
        esCompatible: false,
        mensaje: 'La plaza no tiene un horario definido',
        detalles: {}
      };
    }

    try {
      // Obtener disponibilidad horaria del estudiante
      const { DisponibilidadHoraria } = require('./index');
      const disponibilidad = await DisponibilidadHoraria.findOne({
        where: { usuarioId: this.usuarioId },
        transaction: options.transaction // ✅ Pasar transaction para evitar deadlock
      });

      if (!disponibilidad) {
        return {
          esCompatible: false,
          mensaje: 'El estudiante no ha registrado su disponibilidad horaria',
          detalles: {
            recomendacion: 'El estudiante debe completar su disponibilidad horaria antes de postularse a plazas'
          }
        };
      }

      // Verificar compatibilidad usando horarioHelper
      const { verificarDisponibilidadEnHorario, generarReporteConflictos } = require('../utils/horarioHelper');
      const resultado = verificarDisponibilidadEnHorario(disponibilidad.disponibilidad, plaza.horario);

      if (!resultado.esCompatible) {
        return {
          esCompatible: false,
          mensaje: 'El horario de la plaza no es compatible con la disponibilidad del estudiante',
          detalles: {
            bloquesSinDisponibilidad: resultado.bloquesSinDisponibilidad,
            reporte: generarReporteConflictos(resultado.bloquesSinDisponibilidad)
          }
        };
      }

      return {
        esCompatible: true,
        mensaje: 'El horario de la plaza es compatible con la disponibilidad del estudiante',
        detalles: {}
      };
    } catch (error) {
      return {
        esCompatible: false,
        mensaje: `Error al verificar compatibilidad: ${error.message}`,
        detalles: { error: error.message }
      };
    }
  };

  EstudianteBecario.prototype.registrarEvaluacion = async function(satisfactoria, observaciones = null) {
    this.evaluacionSatisfactoria = satisfactoria;
    this.fechaEvaluacion = new Date();
    if (observaciones) {
      this.observaciones = observaciones;
    }

    // Aplicar descuento automáticamente si es satisfactoria
    if (satisfactoria) {
      const { ProgramaBeca } = require('./index');
      const programa = await ProgramaBeca.findOne({
        where: { nombre: this.tipoBeca, activo: true }
      });
      if (programa) {
        this.descuentoAplicado = programa.porcentajeDescuento;
      }
    }

    return this.save();
  };

  /**
   * Obtener supervisor actual del estudiante becario a través de la plaza asignada
   * @returns {Promise<Usuario|null>} - Supervisor o null si no tiene plaza asignada
   */
  EstudianteBecario.prototype.getSupervisorActual = async function() {
    if (!this.plazaAsignada) {
      return null;
    }

    // Si la plaza ya está cargada con el supervisor
    if (this.plaza && this.plaza.supervisor) {
      return this.plaza.supervisor;
    }

    // Si no, cargar la plaza con su supervisor
    const { Plaza, Usuario } = require('./index');
    const plaza = await Plaza.findByPk(this.plazaAsignada, {
      include: [{
        model: Usuario,
        as: 'supervisor',
        attributes: ['id', 'nombre', 'apellido', 'email', 'cedula', 'telefono']
      }]
    });

    return plaza ? plaza.supervisor : null;
  };

  /**
   * Obtener límite de trimestres según tipo de beca
   * @returns {number|null} - Límite de trimestres o null si no hay límite
   */
  EstudianteBecario.prototype.getLimiteTrimestres = function() {
    const LIMITES_TRIMESTRES = {
      'Ayudantía': 6,
      'Impacto': 4,
      'Excelencia': 8,
      'Exoneración de Pago': null,
      'Formación Docente': null
    };
    return LIMITES_TRIMESTRES[this.tipoBeca] || null;
  };

  /**
   * Verificar si el becario puede renovar para otro trimestre
   * @returns {boolean} - true si puede renovar, false si alcanzó el límite
   */
  EstudianteBecario.prototype.puedeRenovar = function() {
    const limite = this.getLimiteTrimestres();
    if (limite === null) {
      return true; // Sin límite, siempre puede renovar
    }
    return this.trimestresCursados < limite;
  };

  return EstudianteBecario;
};