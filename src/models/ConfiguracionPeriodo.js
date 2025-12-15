const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfiguracionPeriodo = sequelize.define('ConfiguracionPeriodo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    periodoAcademico: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 10],
        is: /^[0-9]{4}-[1-3]$/i, // Formato: 2025-1, 2025-2, 2025-3
      },
      comment: 'Período académico en formato YYYY-N (ej: 2025-1, 2025-2)'
    },
    semanaActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 12,
        isInt: true
      },
      comment: 'Semana actual del trimestre (1-12)'
    },
    semanasHabilitadas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('semanasHabilitadas debe ser un array');
          }
          // Verificar que todos los elementos sean números entre 1 y 12
          const invalidos = value.filter(s => typeof s !== 'number' || s < 1 || s > 12);
          if (invalidos.length > 0) {
            throw new Error('Todas las semanas deben ser números entre 1 y 12');
          }
          // Verificar que no haya duplicados
          const unicos = [...new Set(value)];
          if (unicos.length !== value.length) {
            throw new Error('No puede haber semanas duplicadas en semanasHabilitadas');
          }
        }
      },
      comment: 'Array de números de semanas habilitadas para reportar (ej: [1,2,3,4])'
    },
    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true
      },
      comment: 'Fecha de inicio del período académico'
    },
    fechaFin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
        esPosteriorAInicio(value) {
          if (value && this.fechaInicio) {
            const inicio = new Date(this.fechaInicio);
            const fin = new Date(value);
            if (fin <= inicio) {
              throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
            }
          }
        }
      },
      comment: 'Fecha de fin del período académico'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si este es el período académico activo actualmente'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      },
      comment: 'Descripción opcional del período académico'
    }
  }, {
    tableName: 'configuracion_periodos',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['periodoAcademico'],
        unique: true
      },
      {
        fields: ['activo']
      },
      {
        fields: ['semanaActual']
      }
    ]
  });

  // Métodos de instancia
  ConfiguracionPeriodo.prototype.habilitarSemana = async function(semana) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw new Error('La semana debe ser un número entre 1 y 12');
    }

    // Verificar que no esté ya habilitada
    if (!this.semanasHabilitadas.includes(semana)) {
      this.semanasHabilitadas.push(semana);
      this.semanasHabilitadas.sort((a, b) => a - b); // Ordenar
      this.changed('semanasHabilitadas', true); // Marcar como modificado para JSONB
      await this.save();
    }

    return this;
  };

  ConfiguracionPeriodo.prototype.deshabilitarSemana = async function(semana) {
    if (typeof semana !== 'number' || semana < 1 || semana > 12) {
      throw new Error('La semana debe ser un número entre 1 y 12');
    }

    const index = this.semanasHabilitadas.indexOf(semana);
    if (index > -1) {
      this.semanasHabilitadas.splice(index, 1);
      this.changed('semanasHabilitadas', true); // Marcar como modificado para JSONB
      await this.save();
    }

    return this;
  };

  ConfiguracionPeriodo.prototype.estaSemanaHabilitada = function(semana) {
    return this.semanasHabilitadas.includes(semana);
  };

  ConfiguracionPeriodo.prototype.cambiarSemanaActual = async function(nuevaSemana) {
    if (typeof nuevaSemana !== 'number' || nuevaSemana < 1 || nuevaSemana > 12) {
      throw new Error('La semana debe ser un número entre 1 y 12');
    }

    this.semanaActual = nuevaSemana;
    await this.save();

    return this;
  };

  ConfiguracionPeriodo.prototype.activar = async function() {
    // Desactivar todos los demás períodos
    await ConfiguracionPeriodo.update(
      { activo: false },
      { where: {} }
    );

    // Activar este período
    this.activo = true;
    await this.save();

    return this;
  };

  ConfiguracionPeriodo.prototype.desactivar = async function() {
    this.activo = false;
    await this.save();
    return this;
  };

  // Métodos estáticos
  ConfiguracionPeriodo.getPeriodoActivo = async function() {
    return await this.findOne({
      where: { activo: true }
    });
  };

  ConfiguracionPeriodo.getPeriodoPorNombre = async function(periodoAcademico) {
    return await this.findOne({
      where: { periodoAcademico }
    });
  };

  ConfiguracionPeriodo.activarPeriodo = async function(periodoId) {
    const periodo = await this.findByPk(periodoId);

    if (!periodo) {
      throw new Error('Período no encontrado');
    }

    await periodo.activar();
    return periodo;
  };

  ConfiguracionPeriodo.crearPeriodo = async function(datos) {
    const { periodoAcademico, semanaActual = 1, semanasHabilitadas = [], fechaInicio, fechaFin, descripcion, activo = false } = datos;

    // Verificar que no exista ya un período con ese nombre
    const existente = await this.findOne({
      where: { periodoAcademico }
    });

    if (existente) {
      throw new Error(`Ya existe un período académico con el nombre ${periodoAcademico}`);
    }

    // Si se marca como activo, desactivar los demás
    if (activo) {
      await this.update(
        { activo: false },
        { where: {} }
      );
    }

    return await this.create({
      periodoAcademico,
      semanaActual,
      semanasHabilitadas,
      fechaInicio,
      fechaFin,
      descripcion,
      activo
    });
  };

  ConfiguracionPeriodo.obtenerTodos = async function() {
    return await this.findAll({
      order: [['periodoAcademico', 'DESC']]
    });
  };

  return ConfiguracionPeriodo;
};
