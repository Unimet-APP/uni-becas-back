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
      await queryInterface.describeTable('respuestas_test_orientacion');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('resultados_test_orientacion',{
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
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
        pregunta_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'preguntas_orientacion',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        usuarioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        ronda: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Ronda del test',
        },
        respuesta: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          comment: 'Respuesta de la pregunta',
        },
        respuesta_correcta: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          comment: 'Respuesta correcta de la pregunta',
        },
        dimension_predicha: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Dimensión predicha de la pregunta',
        },
        tiempo_respuesta: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Tiempo de respuesta de la pregunta',
        },
        nivel_seguridad: {
          type: Sequelize.ENUM('seguro','no_seguro'),
          allowNull: false,
          comment: 'Nivel de seguridad de la respuesta',
        },
        time_stamp_respuesta: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
          comment: 'Timestamp de la respuesta',
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
      await queryInterface.addIndex('resultados_test_orientacion', ['sesionId']);
      await queryInterface.addIndex('resultados_test_orientacion', ['usuarioId']);
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('resultados_test_orientacion');

    // 2. ELIMINAR ENUM (PostgreSQL)
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_resultados_test_orientacion_nivel_seguridad";'
    );
  }
};