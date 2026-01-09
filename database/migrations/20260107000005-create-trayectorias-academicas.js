"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("trayectorias_academicas");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("trayectorias_academicas", {
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
          comment: "Usuario al que pertenece esta trayectoria",
        },
        carrera_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "careers",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          comment: "Carrera actual o carrera analizada (nullable si no está en sistema)",
        },
        trimestre: {
          type: Sequelize.INTEGER,
          allowNull: true,
          validate: {
            min: 1,
            max: 15,
          },
          comment: "Trimestre actual del estudiante",
        },
        iaa: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          validate: {
            min: 0,
            max: 20,
          },
          comment: "Índice Académico Acumulado",
        },
        asignaturas_aprobadas: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          validate: {
            min: 0,
          },
          comment: "Número total de asignaturas aprobadas",
        },
        asignaturas_reprobadas: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          validate: {
            min: 0,
          },
          comment: "Número total de asignaturas reprobadas",
        },
        asignaturas_por_area: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Asignaturas agrupadas por área (ej: {Matemáticas: 5, Humanidades: 3, Ciencias: 4})",
        },
        rendimiento_por_trimestre: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Historial de IAA por trimestre (ej: {'2024-1': 16.5, '2024-2': 17.2})",
        },
        actividades_extracurriculares: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de actividades extracurriculares (ej: [{tipo: 'deportes', nombre: 'Fútbol'}, ...])",
        },
        proyectos_realizados: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de proyectos realizados (ej: [{nombre: 'Proyecto X', area: 'Tecnología'}, ...])",
        },
        becas_activas: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Array de IDs de becas activas del estudiante",
        },
        fecha_registro: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_DATE"),
          comment: "Fecha de registro de esta trayectoria",
        },
        es_actual: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment:
            "Indica si esta es la trayectoria actual del estudiante (solo una por usuario)",
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
        "trayectorias_academicas",
        ["usuario_id", "es_actual"],
        {
          name: "idx_trayectorias_usuario_actual",
        }
      );

      await queryInterface.addIndex("trayectorias_academicas", ["carrera_id"], {
        name: "idx_trayectorias_carrera",
      });

      await queryInterface.addIndex("trayectorias_academicas", ["fecha_registro"], {
        name: "idx_trayectorias_fecha",
      });

      // Índice parcial único: solo una trayectoria actual por usuario
      // Nota: Esto se puede hacer con un índice parcial único en PostgreSQL
      // pero Sequelize no lo soporta directamente, así que lo haremos con un constraint
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX uq_trayectorias_usuario_actual 
          ON trayectorias_academicas (usuario_id) 
          WHERE es_actual = true;
        `);
      } catch (e) {
        // Si falla, continuar (puede que ya exista)
        console.log("No se pudo crear índice único parcial, puede que ya exista");
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex(
        "trayectorias_academicas",
        "idx_trayectorias_usuario_actual"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "trayectorias_academicas",
        "idx_trayectorias_carrera"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "trayectorias_academicas",
        "idx_trayectorias_fecha"
      );
    } catch (e) {}

    // Eliminar índice único parcial
    try {
      await queryInterface.sequelize.query(
        "DROP INDEX IF EXISTS uq_trayectorias_usuario_actual;"
      );
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("trayectorias_academicas");
    } catch (e) {}
  },
};

