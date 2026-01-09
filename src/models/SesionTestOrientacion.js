const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');

module.exports = (sequelize) => {
  const SesionTestOrientacion = sequelize.define(
    'SesionTestOrientacion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Usuario que realiza el test',
      },
      tipo_test: {
        type: DataTypes.ENUM('Kuder', 'Holland_RIASEC'),
        allowNull: false,
        comment: 'Tipo de test de orientación',
        validate: {
          isIn: [['Kuder', 'Holland_RIASEC']],
        },
      },
      estado: {
        type: DataTypes.ENUM('iniciada', 'ronda_1_completada', 'ronda_2_completada', 'finalizada', 'abandonada'),
        allowNull: false,
        defaultValue: 'iniciada',
        comment: 'Estado actual de la sesión del test',
        validate: {
          isIn: [['iniciada', 'ronda_1_completada', 'ronda_2_completada', 'finalizada', 'abandonada']],
        },
      },
      seed_aleatorio: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Seed aleatorio único para reproducibilidad de selección de preguntas',
        validate: {
          notEmpty: true,
        },
      },
      fecha_inicio: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora de inicio del test',
      },
      fecha_ronda_1: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de completación de Ronda 1',
      },
      fecha_ronda_2: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de completación de Ronda 2',
      },
      fecha_finalizacion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de finalización completa del test',
      },
      preguntas_ronda_1: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de IDs de preguntas usadas en Ronda 1',
      },
      preguntas_ronda_2: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de IDs de preguntas usadas en Ronda 2',
      },
      puntuaciones_ronda_1: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Puntuaciones por dimensión después de Ronda 1 (ej: {Realista: 70, Investigador: 85})',
      },
      puntuaciones_ronda_2: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Puntuaciones por dimensión después de Ronda 2 (con pesos dinámicos)',
      },
      nivel_confianza_ronda_1: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Nivel de confianza por dimensión en Ronda 1 (alto, medio, bajo)',
      },
      nivel_confianza_ronda_2: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Nivel de confianza por dimensión en Ronda 2 (alto, medio, bajo)',
      },
      areas_ambiguedad: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de dimensiones con puntuación ambigua (40-60) detectadas en Ronda 1',
      },
      discrepancias_detectadas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de discrepancias detectadas entre test y trayectoria académica',
      },
      tiempo_total_segundos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tiempo total en segundos para completar el test',
        validate: {
          min: 0,
        },
      },
    },
    {
      tableName: 'sesiones_test_orientacion',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  // Definir asociaciones
  SesionTestOrientacion.associate = (models) => {
    // Una sesión pertenece a un usuario
    SesionTestOrientacion.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });

    // Una sesión tiene muchas respuestas
    SesionTestOrientacion.hasMany(models.RespuestaTestOrientacion, {
      foreignKey: 'sesion_id',
      as: 'respuestas',
    });

    // Una sesión tiene un resultado
    SesionTestOrientacion.hasOne(models.ResultadoOrientacion, {
      foreignKey: 'sesion_id',
      as: 'resultado',
    });
  };

  // Métodos de instancia
  SesionTestOrientacion.prototype.completarRonda1 = async function (puntuaciones, preguntas) {
    await this.update({
      estado: 'ronda_1_completada',
      fecha_ronda_1: new Date(),
      puntuaciones_ronda_1: puntuaciones,
      preguntas_ronda_1: preguntas,
    });
    return this;
  };

  SesionTestOrientacion.prototype.completarRonda2 = async function (puntuaciones, preguntas) {
    await this.update({
      estado: 'ronda_2_completada',
      fecha_ronda_2: new Date(),
      puntuaciones_ronda_2: puntuaciones,
      preguntas_ronda_2: preguntas,
    });
    return this;
  };

  SesionTestOrientacion.prototype.finalizar = async function () {
    await this.update({
      estado: 'finalizada',
      fecha_finalizacion: new Date(),
    });
    return this;
  };

  SesionTestOrientacion.prototype.obtenerAreasAmbiguas = function () {
    if (!this.areas_ambiguedad || !Array.isArray(this.areas_ambiguedad)) {
      return [];
    }
    return this.areas_ambiguedad;
  };

  SesionTestOrientacion.prototype.obtenerDiscrepancias = function () {
    if (!this.discrepancias_detectadas || !Array.isArray(this.discrepancias_detectadas)) {
      return [];
    }
    return this.discrepancias_detectadas;
  };

  SesionTestOrientacion.prototype.estaCompletada = function () {
    return this.estado === 'finalizada';
  };

  SesionTestOrientacion.prototype.estaActiva = function () {
    return ['iniciada', 'ronda_1_completada', 'ronda_2_completada'].includes(this.estado);
  };

  // Métodos estáticos
  SesionTestOrientacion.obtenerActivaPorUsuario = async function (usuarioId) {
    return await this.findOne({
      where: {
        usuario_id: usuarioId,
        estado: {
          [Op.in]: ['iniciada', 'ronda_1_completada', 'ronda_2_completada'],
        },
      },
    });
  };

  SesionTestOrientacion.obtenerHistorialPorUsuario = async function (usuarioId) {
    return await this.findAll({
      where: {
        usuario_id: usuarioId,
      },
      order: [['fecha_inicio', 'DESC']],
      include: [
        {
          model: sequelize.models.ResultadoOrientacion,
          as: 'resultado',
        },
      ],
    });
  };

  return SesionTestOrientacion;
};

