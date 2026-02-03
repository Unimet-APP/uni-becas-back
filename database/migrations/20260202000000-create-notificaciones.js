'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable('notificaciones');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('notificaciones', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        usuario_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'usuarios',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'ID del usuario que recibe la notificación'
        },
        titulo: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Título de la notificación'
        },
        contenido: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Contenido descriptivo de la notificación'
        },
        tipo: {
          type: Sequelize.ENUM('evento', 'anuncio', 'recordatorio', 'campana', 'mensaje'),
          defaultValue: 'anuncio',
          comment: 'Tipo de notificación para determinar el ícono'
        },
        leida: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Indica si el usuario ya leyó la notificación'
        },
        fecha_lectura: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Fecha y hora en que se marcó como leída'
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Datos adicionales (URL, botón CTA, etc.)'
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
      await queryInterface.addIndex('notificaciones', ['usuario_id'], {
        name: 'idx_notificaciones_usuario_id',
      });

      await queryInterface.addIndex('notificaciones', ['leida'], {
        name: 'idx_notificaciones_leida',
      });

      await queryInterface.addIndex('notificaciones', ['fecha_creacion'], {
        name: 'idx_notificaciones_fecha_creacion',
      });

      await queryInterface.addIndex('notificaciones', ['usuario_id', 'leida'], {
        name: 'idx_notificaciones_usuario_leida',
      });

      console.log('✅ Tabla notificaciones creada exitosamente');
      console.log('✅ Índices creados exitosamente');
    } else {
      console.log('ℹ️ La tabla notificaciones ya existe, saltando creación');
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex('notificaciones', 'idx_notificaciones_usuario_id');
      await queryInterface.removeIndex('notificaciones', 'idx_notificaciones_leida');
      await queryInterface.removeIndex('notificaciones', 'idx_notificaciones_fecha_creacion');
      await queryInterface.removeIndex('notificaciones', 'idx_notificaciones_usuario_leida');
      console.log('✅ Índices eliminados');
    } catch (error) {
      console.log('⚠️ Error al eliminar índices (puede que no existan):', error.message);
    }

    // Eliminar tabla
    await queryInterface.dropTable('notificaciones');
    console.log('✅ Tabla notificaciones eliminada');

    // Eliminar ENUM
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_notificaciones_tipo"`);
    console.log('✅ ENUM eliminado');
    console.log('✅ Migración revertida completamente');
  }
};
