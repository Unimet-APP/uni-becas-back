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
      await queryInterface.describeTable('sesiones_test_orientacion');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {

      await queryInterface.createTable('sesiones_test_orientacion',{
        id: {
          type:Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
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
        tipoTest: {
          type: Sequelize.ENUM('Holland_RIASEC','Kuder'),
          allowNull: false,
          defaultValue: 'Holland_RIASEC',
          comment: 'Tipo de test',
        },
        estado: {
          type: Sequelize.ENUM('iniciada','ronda_1_completada','ronda_2_completada','finalizada','abandonada'),
        },
        seed_aleatorio:{
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Seed aleatorio para la sesión',
        },
        fecha_inicio: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
          comment: 'Fecha de inicio de la sesión',
        },
        fecha_ronda_1: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Fecha de inicio de la ronda 1',
        },
        fecha_ronda_2: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Fecha de inicio de la ronda 2',
        },
        fecha_completada: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Fecha de completado de la sesión',
        },
        preguntas_ronda_1: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Preguntas de la ronda 1',
        },
        preguntas_ronda_2: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Preguntas de la ronda 2',
        },
        puntuaciones_ronda_1: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Respuestas de la ronda 1',
        },
        puntuaciones_ronda_2: {
          defaultValue: [],
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Respuestas de la ronda 2',
        },
        nivel_confianza_ronda_1: {
          type: Sequelize.DECIMAL(4,2),
          allowNull: true,
          comment: 'Nivel de confianza de la ronda 1',
        },
        nivel_confianza_ronda_2: {
          type: Sequelize.DECIMAL(4,2),
          allowNull: true,
          comment: 'Nivel de confianza de la ronda 2',
        },
        areas_ambiguedad: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Areas de ambiguedad',
        },
        discrepancias: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Discrepancias',
        },
        tiempo_total_segyndos: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Tiempo total de la sesión en segundos',
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
 
    await queryInterface.addIndex('sesiones_test_orientacion', ['usuarioId', 'estado'], {
      name: 'idx_sesiones_test_orientacion_usuario',
    });
    await queryInterface.addIndex('sesiones_test_orientacion', ['fecha_inicio'], {
      name: 'idx_sesiones_n_fecha_inicio',
    });
    await queryInterface.addIndex('sesiones_test_orientacion', ['tipoTest'], {
      name: 'idx_sesiones_tipo_test',
    });
    await queryInterface.addIndex('sesiones_test_orientacion', ['usuarioId', 'seed_aleatorio'], {
      name: 'idx_sesiones_usuario_seed',
    });

  }},

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_test_orientacion_usuario');
    await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_n_fecha_inicio');
    await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_tipo_test');
    await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_usuario_seed');
    await queryInterface.dropTable('sesiones_test_orientacion');
    
    await queryInterface.dropTable('sesiones_test_orientacion');

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_sesiones_test_orientacion_estado"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_sesiones_test_orientacion_tipo_test"`);
    console.log('✅ ENUMs eliminados');
    console.log('✅ Migración revertida');
    console.log('✅ Migración completada');
    console.log('✅ Migración revertida');
  }
};
