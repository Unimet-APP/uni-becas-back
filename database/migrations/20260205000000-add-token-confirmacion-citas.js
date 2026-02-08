'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la columna ya existe
    const tableDescription = await queryInterface.describeTable('citas_orientacion');

    if (!tableDescription.token_confirmacion) {
      await queryInterface.addColumn(
        'citas_orientacion',
        'token_confirmacion',
        {
          type: Sequelize.STRING(64),
          allowNull: true,
          unique: true,
          comment: 'Token único para confirmar/cancelar la cita sin autenticación'
        }
      );

      // Crear índice para el token
      await queryInterface.addIndex('citas_orientacion', ['token_confirmacion'], {
        name: 'idx_citas_token_confirmacion',
        unique: true,
      });

      console.log('✅ Columna token_confirmacion agregada a citas_orientacion');
    } else {
      console.log('ℹ️  Columna token_confirmacion ya existe');
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('citas_orientacion', 'idx_citas_token_confirmacion');
    } catch (error) {
      console.log('⚠️ Índice no encontrado');
    }

    await queryInterface.removeColumn('citas_orientacion', 'token_confirmacion');
    console.log('✅ Columna token_confirmacion eliminada');
  }
};
