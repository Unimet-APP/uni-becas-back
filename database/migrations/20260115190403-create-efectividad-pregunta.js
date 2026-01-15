'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    let tableExists = true;
    try {
      await queryInterface.describeTable('efectividad_pregunta');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      
    await queryInterface.createTable('efectividad_pregunta',{
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      preguntaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'preguntas_orientacion',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sesionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sesiones_test_orientacion',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      prediccion_correcta: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Predicción correcta de la pregunta',
      },
      dimension_predicha: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Dimensión predicha de la pregunta',
      },
      dimension_real: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Dimensión real de la pregunta',
      },
      fecha_analisis: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
        comment: 'Fecha de análisis de la pregunta',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
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
    
  }},

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
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
