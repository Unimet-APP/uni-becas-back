"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;
    try {
      await queryInterface.describeTable("trayectorias_escolares");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("trayectorias_escolares", {
        
        // 1. IDENTIFICACIÓN
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
        },
        usuario_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "usuarios", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },

        // 2. DATOS DE TU INTERFAZ (Imagen)
        promedios_por_ano: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
          comment: "Guarda los inputs de tu pantalla: { '1ero': 16.5, '2do': 17.0 }",
        },
        promedio_general_acumulado: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          comment: "Promedio total de todos los años cursados",
        },

        // 3. INFORMACIÓN ESCOLAR
        grado_actual: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: "Año que cursa actualmente (ej: 5to Año)",
        },
        materias_destacadas: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Materias donde el alumno rinde mejor según su autopercepción",
        },

        // 4. ACTIVIDADES Y PROYECTOS
        actividades_extracurriculares: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        proyectos_realizados: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },

        // 5. ESTADO Y AUDITORÍA
        es_actual: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        fecha_registro: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_DATE"),
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

      // --- ÍNDICES ---
      await queryInterface.addIndex("trayectorias_escolares", ["usuario_id", "es_actual"], {
        name: "idx_escolar_usuario_actual",
      });

      // Garantizar que solo haya una trayectoria activa por estudiante
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX uq_trayectoria_escolar_actual 
          ON trayectorias_escolares (usuario_id) 
          WHERE es_actual = true;
        `);
      } catch (e) {}
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("trayectorias_escolares");
  },
};