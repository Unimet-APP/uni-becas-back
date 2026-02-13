'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable('citas_orientacion');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('citas_orientacion', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        estudiante_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'ID del estudiante que recibe la orientación'
        },
        especialista_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'ID del especialista que agenda la cita'
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Fecha de la cita'
        },
        hora: {
          type: Sequelize.TIME,
          allowNull: false,
          comment: 'Hora de la cita'
        },
        modalidad: {
          type: Sequelize.ENUM('presencial', 'virtual', 'telefonica'),
          defaultValue: 'presencial',
          comment: 'Modalidad de la cita'
        },
        motivo: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Motivo de la cita'
        },
        notas: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Notas adicionales sobre la cita'
        },
        estado: {
          type: Sequelize.ENUM('pendiente', 'confirmada', 'completada', 'cancelada'),
          defaultValue: 'pendiente',
          comment: 'Estado de la cita'
        },
        notas_seguimiento: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Notas de seguimiento después de la cita'
        },
        fecha_creacion: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        fecha_actualizacion: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        }
      });

      // Crear índices para mejorar el rendimiento
      await queryInterface.addIndex('citas_orientacion', ['estudiante_id'], {
        name: 'idx_citas_estudiante_id',
      });

      await queryInterface.addIndex('citas_orientacion', ['especialista_id'], {
        name: 'idx_citas_especialista_id',
      });

      await queryInterface.addIndex('citas_orientacion', ['fecha'], {
        name: 'idx_citas_fecha',
      });

      await queryInterface.addIndex('citas_orientacion', ['estado'], {
        name: 'idx_citas_estado',
      });

      await queryInterface.addIndex('citas_orientacion', ['estudiante_id', 'fecha'], {
        name: 'idx_citas_estudiante_fecha',
      });

      console.log('✅ Tabla citas_orientacion creada exitosamente');
      console.log('✅ Índices creados exitosamente');
    } else {
      console.log('ℹ️ La tabla citas_orientacion ya existe, saltando creación');
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_estudiante_id');
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_especialista_id');
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_fecha');
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_estado');
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_estudiante_fecha');
      console.log('✅ Índices eliminados');
    } catch (error) {
      console.log('⚠️ Error al eliminar índices (puede que no existan):', error.message);
    }

    // Eliminar tabla
    await queryInterface.dropTable('citas_orientacion');
    console.log('✅ Tabla citas_orientacion eliminada');

    // Eliminar ENUMs
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_citas_orientacion_modalidad"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_citas_orientacion_estado"`);
    console.log('✅ ENUMs eliminados');
    console.log('✅ Migración revertida completamente');
  }
};
