"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("resultados_orientacion");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("resultados_orientacion", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
        },
        sesion_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: "sesiones_test_orientacion",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          comment: "Sesión de test que generó este resultado",
        },
        usuario_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "usuarios",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          comment: "Usuario al que pertenece este resultado",
        },
        tipo_test: {
          type: Sequelize.ENUM("Kuder", "Holland_RIASEC"),
          allowNull: false,
          comment: "Tipo de test realizado",
        },
        puntuaciones_finales: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
          comment:
            "Puntuaciones finales por dimensión después de aplicar pesos dinámicos (ej: {Realista: 72, Investigador: 88})",
        },
        codigo_holland: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment:
            "Código Holland de 3 letras (ej: 'ISR' = Investigador, Social, Realista)",
        },
        perfil_dominante: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: "Dimensión con mayor puntuación (perfil principal)",
        },
        perfil_secundario: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: "Segunda dimensión con mayor puntuación",
        },
        nivel_confianza_general: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          comment: "Nivel de confianza general en el resultado (0-100)",
        },
        analisis_llm: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Análisis completo generado por el LLM (perfil vocacional, fortalezas, áreas de desarrollo)",
        },
        recomendaciones_carreras: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de carreras recomendadas con scores (ej: [{carreraId: 1, nombre: '...', puntuacion: 85, razones: [...]}])",
        },
        perfil_vocacional: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Perfil vocacional consolidado (intereses, habilidades, valores)",
        },
        trayectoria_academica_analizada: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Snapshot de la trayectoria académica al momento del test (para referencia histórica)",
        },
        areas_desarrollo: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Áreas identificadas para desarrollo personal",
        },
        sugerencias_acompanamiento: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Sugerencias de acompañamiento y seguimiento",
        },
        plan_desarrollo: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Plan de desarrollo vocacional (corto, mediano, largo plazo)",
        },
        factor_correccion_aplicado: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Factores de corrección aplicados por validación cruzada (para transparencia)",
        },
        version_analisis: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "1.0",
          comment: "Versión del algoritmo de análisis usado",
        },
        fecha_generacion: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
          comment: "Fecha y hora de generación del resultado",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });

      // Crear índices
      await queryInterface.addIndex("resultados_orientacion", ["usuario_id"], {
        name: "idx_resultados_usuario",
      });

      await queryInterface.addIndex("resultados_orientacion", ["fecha_generacion"], {
        name: "idx_resultados_fecha",
      });

      await queryInterface.addIndex("resultados_orientacion", ["codigo_holland"], {
        name: "idx_resultados_holland",
      });

      await queryInterface.addIndex("resultados_orientacion", ["tipo_test"], {
        name: "idx_resultados_tipo_test",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex("resultados_orientacion", "idx_resultados_usuario");
    } catch (e) {}

    try {
      await queryInterface.removeIndex("resultados_orientacion", "idx_resultados_fecha");
    } catch (e) {}

    try {
      await queryInterface.removeIndex("resultados_orientacion", "idx_resultados_holland");
    } catch (e) {}

    try {
      await queryInterface.removeIndex("resultados_orientacion", "idx_resultados_tipo_test");
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("resultados_orientacion");
    } catch (e) {}

    // Eliminar ENUM
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_resultados_orientacion_tipo_test";'
      );
    } catch (e) {}
  },
};

