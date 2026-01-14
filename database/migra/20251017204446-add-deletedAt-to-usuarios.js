'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna deletedAt para soft deletes
    await queryInterface.addColumn('usuarios', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha de eliminación lógica del usuario'
    });

    // Agregar índice para optimizar consultas que filtran por deletedAt
    await queryInterface.addIndex('usuarios', ['deletedAt'], {
      name: 'usuarios_deletedAt'
    });

    console.log('✅ Columna deletedAt agregada a tabla usuarios con índice');
  },

  async down(queryInterface, Sequelize) {
    // Remover índice primero
    await queryInterface.removeIndex('usuarios', 'usuarios_deletedAt');

    // Remover columna deletedAt
    await queryInterface.removeColumn('usuarios', 'deletedAt');

    console.log('✅ Columna deletedAt removida de tabla usuarios');
  }
};
