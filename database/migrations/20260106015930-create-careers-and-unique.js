"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Crear tabla solo si no existe (para que no te explote si ya la creaste)
    let tableExists = true;
    try {
      await queryInterface.describeTable("careers");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("careers", {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        code: { type: Sequelize.STRING(30), allowNull: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        faculty: { type: Sequelize.STRING(120), allowNull: false },
        area: { type: Sequelize.STRING(120), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        profile: { type: Sequelize.TEXT, allowNull: true },
        job_field: { type: Sequelize.TEXT, allowNull: true },
        duration: { type: Sequelize.STRING(50), allowNull: true },
        modality: { type: Sequelize.STRING(50), allowNull: true },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
    }

    // 2) Crear índice UNIQUE para evitar duplicados (si no existe)
    //    (Si ya existe, esto podría fallar; por eso lo envolvemos)
    try {
      await queryInterface.addIndex("careers", ["name", "faculty"], {
        unique: true,
        name: "uq_careers_name_faculty",
      });
    } catch (e) {
      // Si ya existe, no hacemos nada
    }
  },

  async down(queryInterface, Sequelize) {
    // Quitar índice si existe
    try {
      await queryInterface.removeIndex("careers", "uq_careers_name_faculty");
    } catch (e) {}

    // OJO: normalmente NO borramos tablas en down en proyectos reales,
    // pero si lo quieres, lo podemos activar.
    // await queryInterface.dropTable("careers");
  },
};