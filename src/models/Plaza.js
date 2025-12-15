const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plaza = sequelize.define('Plaza', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200]
      }
    },
    ubicacion: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: [0, 200]
      }
    },
    capacidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10,
        isInt: true
      }
    },
    ocupadas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        isInt: true,
        noExcedeCapacidad(value) {
          if (value > this.capacidad) {
            throw new Error('Las plazas ocupadas no pueden exceder la capacidad');
          }
        }
      }
    },
    horario: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidHorario(value) {
          if (!Array.isArray(value)) {
            throw new Error('Horario debe ser un array de objetos');
          }

          // Validar cada elemento del array
          value.forEach((item, index) => {
            if (!item.dia || !item.horaInicio || !item.horaFin) {
              throw new Error(`Horario en índice ${index} debe tener dia, horaInicio y horaFin`);
            }

            const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            if (!diasValidos.includes(item.dia)) {
              throw new Error(`Día inválido en índice ${index}: ${item.dia}`);
            }

            // Validar formato de hora HH:MM
            const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!horaRegex.test(item.horaInicio) || !horaRegex.test(item.horaFin)) {
              throw new Error(`Formato de hora inválido en índice ${index}. Use HH:MM`);
            }
          });
        }
      }
    },
    estado: {
      type: DataTypes.ENUM(
        'Activa',
        'Inactiva',
        'Completa'
      ),
      allowNull: false,
      defaultValue: 'Activa',
      validate: {
        notEmpty: true
      }
    },
    tipoAyudantia: {
      type: DataTypes.ENUM(
        'academica',
        'administrativa',
        'investigacion'
      ),
      allowNull: false,
      defaultValue: 'academica',
      validate: {
        notEmpty: true
      }
    },
    descripcionActividades: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requisitosEspeciales: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidRequisitos(value) {
          if (value !== null && value !== undefined && !Array.isArray(value)) {
            throw new Error('Requisitos especiales debe ser un array de strings');
          }

          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item !== 'string') {
                throw new Error(`Requisito en índice ${index} debe ser un string`);
              }
            });
          }
        }
      }
    },
    horasSemana: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 5,
        max: 10,
        isInt: true,
        horasValidas(value) {
          // 10 horas para ayudantía regular, 5 horas para intensiva
          if (![5, 10].includes(value)) {
            throw new Error('Las horas por semana deben ser 5 (intensiva) o 10 (regular)');
          }
        }
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
    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fechaFin: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    supervisorResponsable: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'plazas',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeUpdate: (plaza) => {
        // Auto-cambiar estado a "Completa" cuando ocupadas = capacidad
        if (plaza.ocupadas >= plaza.capacidad && plaza.estado === 'Activa') {
          plaza.estado = 'Completa';
        }

        // Auto-cambiar estado a "Activa" cuando hay espacio disponible
        if (plaza.ocupadas < plaza.capacidad && plaza.estado === 'Completa') {
          plaza.estado = 'Activa';
        }
      },
      // beforeSave: Hook removido - causaba timeouts en asignación de plazas
      // La validación de "un supervisor solo puede tener una plaza activa por período"
      // puede agregarse manualmente en el controller si es necesaria en el futuro
      /*
      beforeSave: async (plaza, options) => {
        // Validar que un supervisor solo tenga una plaza activa por período
        if (plaza.supervisorResponsable && plaza.estado === 'Activa') {
          const { Plaza } = require('./index');
          const plazasExistentes = await Plaza.findAll({
            where: {
              supervisorResponsable: plaza.supervisorResponsable,
              periodoAcademico: plaza.periodoAcademico,
              estado: 'Activa',
              id: {
                [sequelize.Sequelize.Op.ne]: plaza.id
              }
            },
            transaction: options.transaction
          });

          if (plazasExistentes && plazasExistentes.length > 0) {
            throw new Error(
              `El supervisor ya tiene una plaza activa en el período ${plaza.periodoAcademico}. ` +
              `Un supervisor solo puede tener una plaza activa por período académico.`
            );
          }
        }
      },
      */
      beforeValidate: (plaza) => {
        // Normalizar nombre
        if (plaza.nombre) {
          plaza.nombre = plaza.nombre.trim();
        }

        // Validar que el horario no tenga conflictos internos (overlap)
        if (plaza.horario && Array.isArray(plaza.horario) && plaza.horario.length > 0) {
          const { horarioTieneConflictosInternos, generarReporteConflictos } = require('../utils/horarioHelper');

          try {
            const resultado = horarioTieneConflictosInternos(plaza.horario);

            if (resultado.tieneConflictos) {
              const reporte = generarReporteConflictos(resultado.conflictos);
              throw new Error(
                `El horario de la plaza tiene bloques que se solapan:\n${reporte}` +
                `Por favor, ajusta los horarios para que no haya solapamiento.`
              );
            }
          } catch (error) {
            if (error.message.includes('solapan')) {
              throw error; // Re-lanzar errores de solapamiento
            }
            // Ignorar otros errores de validación de horario (serán capturados por otras validaciones)
          }
        }

        // Sanitización de campo JSONB horario (prevenir XSS, inyección)
        if (plaza.horario && Array.isArray(plaza.horario)) {
          plaza.horario = plaza.horario.map(item => {
            if (typeof item !== 'object' || item === null) {
              return item;
            }

            const sanitizedItem = {};

            for (const [key, value] of Object.entries(item)) {
              if (typeof value === 'string') {
                // Sanitizar strings: remover HTML, scripts, y caracteres peligrosos
                sanitizedItem[key] = value
                  .replace(/<[^>]*>/g, '') // Remover HTML tags
                  .replace(/javascript:/gi, '') // Remover javascript: protocol
                  .replace(/on\w+\s*=/gi, '') // Remover event handlers
                  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
                  .trim()
                  .substring(0, 100); // Limitar longitud
              } else {
                sanitizedItem[key] = value;
              }
            }

            return sanitizedItem;
          });
        }

        // Sanitización de campo JSONB requisitosEspeciales (array de strings)
        if (plaza.requisitosEspeciales && Array.isArray(plaza.requisitosEspeciales)) {
          plaza.requisitosEspeciales = plaza.requisitosEspeciales.map(requisito => {
            if (typeof requisito === 'string') {
              // Sanitizar cada requisito
              return requisito
                .replace(/<[^>]*>/g, '') // Remover HTML tags
                .replace(/javascript:/gi, '') // Remover javascript: protocol
                .replace(/on\w+\s*=/gi, '') // Remover event handlers
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
                .replace(/[<>'"]/g, (char) => { // Escapar caracteres peligrosos
                  const entities = { '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
                  return entities[char] || char;
                })
                .trim()
                .substring(0, 500); // Limitar longitud de cada requisito
            }
            return requisito;
          });
        }
      }
    },
    indexes: [
      {
        fields: ['estado']
      },
      {
        fields: ['tipoAyudantia']
      },
      {
        fields: ['periodoAcademico']
      },
      {
        fields: ['supervisorResponsable']
      }
    ]
  });

  // Definir asociaciones
  Plaza.associate = (models) => {
    // Una plaza puede tener un supervisor responsable
    Plaza.belongsTo(models.Usuario, {
      foreignKey: 'supervisorResponsable',
      as: 'supervisor'
    });

    // Una plaza puede tener múltiples estudiantes becarios asignados
    Plaza.hasMany(models.EstudianteBecario, {
      foreignKey: 'plazaAsignada',
      as: 'estudiantesAsignados'
    });

    // Una plaza puede tener múltiples postulaciones
    Plaza.hasMany(models.PostulacionPlaza, {
      foreignKey: 'plazaId',
      as: 'postulaciones'
    });
  };

  // Métodos de instancia
  Plaza.prototype.plazasDisponibles = function() {
    return this.capacidad - this.ocupadas;
  };

  Plaza.prototype.puedeAsignarEstudiante = function() {
    return this.estado === 'Activa' && this.ocupadas < this.capacidad;
  };

  Plaza.prototype.esIntensiva = function() {
    return this.horasSemana === 5;
  };

  Plaza.prototype.esRegular = function() {
    return this.horasSemana === 10;
  };

  Plaza.prototype.asignarEstudiante = function() {
    if (!this.puedeAsignarEstudiante()) {
      throw new Error('No se puede asignar estudiante a esta plaza');
    }

    this.ocupadas += 1;

    // Auto-cambiar estado si se llena
    if (this.ocupadas >= this.capacidad) {
      this.estado = 'Completa';
    }

    return this.save();
  };

  Plaza.prototype.liberarEstudiante = function() {
    if (this.ocupadas <= 0) {
      throw new Error('No hay estudiantes asignados para liberar');
    }

    this.ocupadas -= 1;

    // Auto-cambiar estado si hay espacio
    if (this.estado === 'Completa' && this.ocupadas < this.capacidad) {
      this.estado = 'Activa';
    }

    return this.save();
  };

  Plaza.prototype.activar = function() {
    if (this.ocupadas < this.capacidad) {
      this.estado = 'Activa';
    } else {
      this.estado = 'Completa';
    }
    return this.save();
  };

  Plaza.prototype.desactivar = function() {
    this.estado = 'Inactiva';
    return this.save();
  };

  Plaza.prototype.asignarSupervisor = async function(supervisorId) {
    // Validar si hay estudiantes asignados antes de cambiar supervisor
    if (this.supervisorResponsable && this.supervisorResponsable !== supervisorId && this.ocupadas > 0) {
      // Si hay estudiantes y se está cambiando el supervisor, emitir advertencia
      // pero permitir el cambio (el gestor debe estar consciente)
      console.warn(`⚠️  ADVERTENCIA: Cambiando supervisor de plaza ${this.nombre} que tiene ${this.ocupadas} estudiante(s) asignado(s)`);
    }

    this.supervisorResponsable = supervisorId;
    return this.save();
  };

  Plaza.prototype.calcularPorcentajeOcupacion = function() {
    return Math.round((this.ocupadas / this.capacidad) * 100);
  };

  Plaza.prototype.horasTotalesPeriodo = function() {
    // Estimando 16 semanas por período académico
    const semanasPorPeriodo = 16;
    return this.horasSemana * semanasPorPeriodo;
  };

  Plaza.prototype.puedeSerEliminada = function() {
    return this.ocupadas === 0;
  };

  // Métodos estáticos
  Plaza.findDisponibles = function() {
    return this.findAll({
      where: {
        estado: 'Activa',
        ocupadas: {
          [sequelize.Sequelize.Op.lt]: sequelize.Sequelize.col('capacidad')
        }
      }
    });
  };

  Plaza.findPorTipo = function(tipoAyudantia) {
    return this.findAll({
      where: { tipoAyudantia }
    });
  };

  Plaza.findPorPeriodo = function(periodoAcademico) {
    return this.findAll({
      where: { periodoAcademico }
    });
  };

  return Plaza;
};