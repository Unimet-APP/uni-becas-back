const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PreguntaOrientacion = sequelize.define(
    'PreguntaOrientacion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      codigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Código único de la pregunta (ej: KUDER-001, HOLLAND-R-001)',
        validate: {
          notEmpty: true,
          len: [1, 50],
        },
      },
      tipo_test: {
        type: DataTypes.ENUM('Kuder', 'Holland_RIASEC', 'Personalizado'),
        allowNull: false,
        comment: 'Tipo de test al que pertenece la pregunta',
        validate: {
          isIn: [['Kuder', 'Holland_RIASEC', 'Personalizado']],
        },
      },
      dimension_principal: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment:
          'Dimensión principal RIASEC o Kuder (Realista, Investigador, Artístico, Social, Emprendedor, Convencional, o Mecánica, Cálculo, etc.)',
        validate: {
          notEmpty: true,
          len: [1, 50],
        },
      },
      dimensiones_secundarias: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de dimensiones que también puede activar esta pregunta',
      },
      texto_pregunta: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Texto completo de la pregunta',
        validate: {
          notEmpty: true,
        },
      },
      tipo_pregunta: {
        type: DataTypes.ENUM('directa', 'comparativa', 'situacional', 'proyectiva'),
        allowNull: false,
        defaultValue: 'directa',
        comment:
          'Tipo de pregunta: directa, comparativa (elige entre opciones), situacional (imagina escenario), proyectiva',
        validate: {
          isIn: [['directa', 'comparativa', 'situacional', 'proyectiva']],
        },
      },
      peso: {
        type: DataTypes.ENUM('alta', 'media', 'baja'),
        allowNull: false,
        defaultValue: 'media',
        comment: 'Polarización de la pregunta: alta (muy polarizante), media, baja',
        validate: {
          isIn: [['alta', 'media', 'baja']],
        },
      },
      carreras_relacionadas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de IDs de carreras relacionadas con esta pregunta',
      },
      correlaciones_academicas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment:
          'Correlaciones con datos académicos (ej: {iaa_minimo: 15, asignaturas: ["Matemáticas"]})',
      },
      efectividad_historica: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0.5,
        comment:
          'Tasa de discriminación histórica (0-1): qué tan bien predice el perfil',
        validate: {
          min: 0,
          max: 1,
        },
      },
      veces_usada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de cuántas veces se ha usado esta pregunta',
        validate: {
          min: 0,
        },
      },
      veces_efectiva: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de cuántas veces predijo correctamente el perfil',
        validate: {
          min: 0,
        },
      },
      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si la pregunta está activa y disponible para usar',
      },
      version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0',
        comment: 'Versión de la pregunta (para tracking de cambios)',
      },
      instrucciones: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Instrucciones específicas para esta pregunta si aplica',
      },
      opciones_respuesta: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment:
          'Opciones de respuesta para preguntas de opción múltiple (null para preguntas abiertas)',
      },
    },
    {
      tableName: 'preguntas_orientacion',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['codigo'],
          name: 'preguntas_orientacion_codigo_unique',
        },
      ],
    }
  );

  // Definir asociaciones
  PreguntaOrientacion.associate = (models) => {
    // Una pregunta puede tener muchas respuestas
    PreguntaOrientacion.hasMany(models.RespuestaTestOrientacion, {
      foreignKey: 'pregunta_id',
      as: 'respuestas',
    });
  };

  // Métodos de instancia
  PreguntaOrientacion.prototype.esPolarizante = function () {
    return this.peso === 'alta';
  };

  PreguntaOrientacion.prototype.estaRelacionadaConCarrera = function (carreraId) {
    if (!this.carreras_relacionadas || !Array.isArray(this.carreras_relacionadas)) {
      return false;
    }
    return this.carreras_relacionadas.includes(carreraId);
  };

  PreguntaOrientacion.prototype.calcularEfectividad = async function () {
    if (this.veces_usada === 0) {
      return 0;
    }
    const efectividad = this.veces_efectiva / this.veces_usada;
    await this.update({ efectividad_historica: efectividad });
    return efectividad;
  };

  // Métodos estáticos
  PreguntaOrientacion.obtenerPorDimension = async function (dimension, tipoTest, limite = 10) {
    return await this.findAll({
      where: {
        dimension_principal: dimension,
        tipo_test: tipoTest,
        activa: true,
      },
      order: [['efectividad_historica', 'DESC']],
      limit: limite,
    });
  };

  PreguntaOrientacion.obtenerPolarizantes = async function (tipoTest, limite = 10) {
    return await this.findAll({
      where: {
        tipo_test: tipoTest,
        peso: 'alta',
        activa: true,
      },
      order: [['efectividad_historica', 'DESC']],
      limit: limite,
    });
  };

  PreguntaOrientacion.obtenerPorEfectividad = async function (
    tipoTest,
    limite = 10,
    orden = 'DESC'
  ) {
    return await this.findAll({
      where: {
        tipo_test: tipoTest,
        activa: true,
      },
      order: [['efectividad_historica', orden]],
      limit: limite,
    });
  };

  return PreguntaOrientacion;
};

