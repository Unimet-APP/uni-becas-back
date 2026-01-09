"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("respuestas_test_orientacion");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("respuestas_test_orientacion", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
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
          comment: "Sesión de test a la que pertenece esta respuesta",
        },
        pregunta_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "preguntas_orientacion",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
          comment: "Pregunta respondida",
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
          comment: "Usuario que respondió (redundante pero útil para consultas)",
        },
        ronda: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            isIn: [[1, 2]],
          },
          comment: "Ronda del test (1 o 2)",
        },
        respuesta: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment:
            "Respuesta del usuario (puede ser string, number, boolean, array según tipo de pregunta)",
        },
        tiempo_respuesta_segundos: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Tiempo que tardó el usuario en responder (en segundos)",
        },
        nivel_seguridad: {
          type: Sequelize.ENUM(
            "muy_seguro",
            "seguro",
            "indeciso",
            "muy_indeciso"
          ),
          allowNull: true,
          comment:
            "Nivel de seguridad del usuario al responder (opcional, del frontend)",
        },
        timestamp_respuesta: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
          comment: "Timestamp exacto de cuando se registró la respuesta",
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
        "respuestas_test_orientacion",
        ["sesion_id", "ronda"],
        {
          name: "idx_respuestas_sesion_ronda",
        }
      );

      await queryInterface.addIndex("respuestas_test_orientacion", ["pregunta_id"], {
        name: "idx_respuestas_pregunta",
      });

      await queryInterface.addIndex("respuestas_test_orientacion", ["usuario_id"], {
        name: "idx_respuestas_usuario",
      });

      // Índice único para evitar respuestas duplicadas (un usuario no puede responder la misma pregunta dos veces en la misma sesión)
      await queryInterface.addIndex(
        "respuestas_test_orientacion",
        ["sesion_id", "pregunta_id"],
        {
          unique: true,
          name: "uq_respuestas_sesion_pregunta",
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex(
        "respuestas_test_orientacion",
        "idx_respuestas_sesion_ronda"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "respuestas_test_orientacion",
        "idx_respuestas_pregunta"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "respuestas_test_orientacion",
        "idx_respuestas_usuario"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "respuestas_test_orientacion",
        "uq_respuestas_sesion_pregunta"
      );
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("respuestas_test_orientacion");
    } catch (e) {}

    // Eliminar ENUM
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_respuestas_test_orientacion_nivel_seguridad";'
      );
    } catch (e) {}
  },
};

