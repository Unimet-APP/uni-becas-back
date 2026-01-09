"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("sesiones_test_orientacion");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("sesiones_test_orientacion", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
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
          comment: "Usuario que realiza el test",
        },
        tipo_test: {
          type: Sequelize.ENUM("Kuder", "Holland_RIASEC"),
          allowNull: false,
          comment: "Tipo de test de orientación",
        },
        estado: {
          type: Sequelize.ENUM(
            "iniciada",
            "ronda_1_completada",
            "ronda_2_completada",
            "finalizada",
            "abandonada"
          ),
          allowNull: false,
          defaultValue: "iniciada",
          comment: "Estado actual de la sesión del test",
        },
        seed_aleatorio: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment:
            "Seed aleatorio único para reproducibilidad de selección de preguntas",
        },
        fecha_inicio: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
          comment: "Fecha y hora de inicio del test",
        },
        fecha_ronda_1: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Fecha y hora de completación de Ronda 1",
        },
        fecha_ronda_2: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Fecha y hora de completación de Ronda 2",
        },
        fecha_finalizacion: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Fecha y hora de finalización completa del test",
        },
        preguntas_ronda_1: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Array de IDs de preguntas usadas en Ronda 1",
        },
        preguntas_ronda_2: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Array de IDs de preguntas usadas en Ronda 2",
        },
        puntuaciones_ronda_1: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Puntuaciones por dimensión después de Ronda 1 (ej: {Realista: 70, Investigador: 85})",
        },
        puntuaciones_ronda_2: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Puntuaciones por dimensión después de Ronda 2 (con pesos dinámicos)",
        },
        nivel_confianza_ronda_1: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Nivel de confianza por dimensión en Ronda 1 (alto, medio, bajo)",
        },
        nivel_confianza_ronda_2: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Nivel de confianza por dimensión en Ronda 2 (alto, medio, bajo)",
        },
        areas_ambiguedad: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de dimensiones con puntuación ambigua (40-60) detectadas en Ronda 1",
        },
        discrepancias_detectadas: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de discrepancias detectadas entre test y trayectoria académica",
        },
        tiempo_total_segundos: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Tiempo total en segundos para completar el test",
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
      await queryInterface.addIndex(
        "sesiones_test_orientacion",
        ["usuario_id", "estado"],
        {
          name: "idx_sesiones_usuario_estado",
        }
      );

      await queryInterface.addIndex("sesiones_test_orientacion", ["fecha_inicio"], {
        name: "idx_sesiones_fecha_inicio",
      });

      await queryInterface.addIndex("sesiones_test_orientacion", ["tipo_test"], {
        name: "idx_sesiones_tipo_test",
      });

      // Índice único para seed_aleatorio por usuario (evitar duplicados)
      await queryInterface.addIndex(
        "sesiones_test_orientacion",
        ["usuario_id", "seed_aleatorio"],
        {
          unique: true,
          name: "uq_sesiones_usuario_seed",
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex(
        "sesiones_test_orientacion",
        "idx_sesiones_usuario_estado"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "sesiones_test_orientacion",
        "idx_sesiones_fecha_inicio"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "sesiones_test_orientacion",
        "idx_sesiones_tipo_test"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "sesiones_test_orientacion",
        "uq_sesiones_usuario_seed"
      );
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("sesiones_test_orientacion");
    } catch (e) {}

    // Eliminar ENUMs
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_sesiones_test_orientacion_tipo_test";'
      );
    } catch (e) {}

    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_sesiones_test_orientacion_estado";'
      );
    } catch (e) {}
  },
};

