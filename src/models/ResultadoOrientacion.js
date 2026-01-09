const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ResultadoOrientacion = sequelize.define(
    'ResultadoOrientacion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      sesion_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'Sesión de test que generó este resultado',
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Usuario al que pertenece este resultado',
      },
      tipo_test: {
        type: DataTypes.ENUM('Kuder', 'Holland_RIASEC'),
        allowNull: false,
        comment: 'Tipo de test realizado',
        validate: {
          isIn: [['Kuder', 'Holland_RIASEC']],
        },
      },
      puntuaciones_finales: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment:
          'Puntuaciones finales por dimensión después de aplicar pesos dinámicos (ej: {Realista: 72, Investigador: 88})',
      },
      codigo_holland: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "Código Holland de 3 letras (ej: 'ISR' = Investigador, Social, Realista)",
        validate: {
          len: [0, 10],
        },
      },
      perfil_dominante: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Dimensión con mayor puntuación (perfil principal)',
        validate: {
          len: [0, 50],
        },
      },
      perfil_secundario: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Segunda dimensión con mayor puntuación',
        validate: {
          len: [0, 50],
        },
      },
      nivel_confianza_general: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Nivel de confianza general en el resultado (0-100)',
        validate: {
          min: 0,
          max: 100,
        },
      },
      analisis_llm: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment:
          'Análisis completo generado por el LLM (perfil vocacional, fortalezas, áreas de desarrollo)',
      },
      recomendaciones_carreras: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment:
          'Array de carreras recomendadas con scores (ej: [{carreraId: 1, nombre: "...", puntuacion: 85, razones: [...]}])',
      },
      perfil_vocacional: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Perfil vocacional consolidado (intereses, habilidades, valores)',
      },
      trayectoria_academica_analizada: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment:
          'Snapshot de la trayectoria académica al momento del test (para referencia histórica)',
      },
      areas_desarrollo: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Áreas identificadas para desarrollo personal',
      },
      sugerencias_acompanamiento: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Sugerencias de acompañamiento y seguimiento',
      },
      plan_desarrollo: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Plan de desarrollo vocacional (corto, mediano, largo plazo)',
      },
      factor_correccion_aplicado: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment:
          'Factores de corrección aplicados por validación cruzada (para transparencia)',
      },
      version_analisis: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0',
        comment: 'Versión del algoritmo de análisis usado',
      },
      fecha_generacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora de generación del resultado',
      },
    },
    {
      tableName: 'resultados_orientacion',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  // Definir asociaciones
  ResultadoOrientacion.associate = (models) => {
    // Un resultado pertenece a una sesión
    ResultadoOrientacion.belongsTo(models.SesionTestOrientacion, {
      foreignKey: 'sesion_id',
      as: 'sesion',
    });

    // Un resultado pertenece a un usuario
    ResultadoOrientacion.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });
  };

  // Métodos de instancia
  ResultadoOrientacion.prototype.obtenerCarrerasRecomendadas = function (limite = null) {
    if (!this.recomendaciones_carreras || !Array.isArray(this.recomendaciones_carreras)) {
      return [];
    }

    // Ordenar por puntuación descendente
    const ordenadas = [...this.recomendaciones_carreras].sort(
      (a, b) => (b.puntuacion || 0) - (a.puntuacion || 0)
    );

    if (limite && limite > 0) {
      return ordenadas.slice(0, limite);
    }

    return ordenadas;
  };

  ResultadoOrientacion.prototype.obtenerPerfilConsolidado = function () {
    if (!this.perfil_vocacional || typeof this.perfil_vocacional !== 'object') {
      return {
        intereses: [],
        habilidades: [],
        valores: [],
      };
    }

    return {
      intereses: this.perfil_vocacional.intereses || [],
      habilidades: this.perfil_vocacional.habilidades || [],
      valores: this.perfil_vocacional.valores || [],
      codigoHolland: this.codigo_holland,
      perfilDominante: this.perfil_dominante,
      perfilSecundario: this.perfil_secundario,
    };
  };

  // Métodos estáticos
  ResultadoOrientacion.obtenerUltimoPorUsuario = async function (usuarioId) {
    return await this.findOne({
      where: {
        usuario_id: usuarioId,
      },
      order: [['fecha_generacion', 'DESC']],
      include: [
        {
          model: sequelize.models.SesionTestOrientacion,
          as: 'sesion',
        },
      ],
    });
  };

  ResultadoOrientacion.obtenerHistorialPorUsuario = async function (usuarioId) {
    return await this.findAll({
      where: {
        usuario_id: usuarioId,
      },
      order: [['fecha_generacion', 'DESC']],
      include: [
        {
          model: sequelize.models.SesionTestOrientacion,
          as: 'sesion',
        },
      ],
    });
  };

  return ResultadoOrientacion;
};

