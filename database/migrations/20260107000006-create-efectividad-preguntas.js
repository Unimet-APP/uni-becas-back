"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("efectividad_preguntas");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("efectividad_preguntas", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
        },
        pregunta_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "preguntas_orientacion",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          comment: "Pregunta evaluada",
        },
        sesion_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "sesiones_test_orientacion",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          comment: "Sesión de test donde se usó esta pregunta",
        },
        prediccion_correcta: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          comment:
            "Si la pregunta predijo correctamente el perfil final del estudiante",
        },
        dimension_predicha: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment:
            "Dimensión que la pregunta predijo como principal (basado en respuesta)",
        },
        dimension_real: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment:
            "Dimensión real del perfil final del estudiante (del resultado)",
        },
        fecha_analisis: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
          comment: "Fecha en que se analizó la efectividad",
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
      await queryInterface.addIndex("efectividad_preguntas", ["pregunta_id"], {
        name: "idx_efectividad_pregunta",
      });

      await queryInterface.addIndex(
        "efectividad_preguntas",
        ["prediccion_correcta"],
        {
          name: "idx_efectividad_correcta",
        }
      );

      await queryInterface.addIndex("efectividad_preguntas", ["sesion_id"], {
        name: "idx_efectividad_sesion",
      });

      await queryInterface.addIndex("efectividad_preguntas", ["fecha_analisis"], {
        name: "idx_efectividad_fecha",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex(
        "efectividad_preguntas",
        "idx_efectividad_pregunta"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "efectividad_preguntas",
        "idx_efectividad_correcta"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "efectividad_preguntas",
        "idx_efectividad_sesion"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "efectividad_preguntas",
        "idx_efectividad_fecha"
      );
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("efectividad_preguntas");
    } catch (e) {}
  },
};

