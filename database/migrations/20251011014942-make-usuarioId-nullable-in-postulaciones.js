'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Hacer usuarioId nullable y cambiar ON DELETE a SET NULL
    await queryInterface.changeColumn('postulaciones', 'usuarioId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    console.log('✅ Columna usuarioId ahora es nullable con ON DELETE SET NULL');
  },

  async down(queryInterface, Sequelize) {
    // Revertir: hacer usuarioId obligatorio de nuevo
    // NOTA: Esto fallará si hay registros con usuarioId NULL
    await queryInterface.changeColumn('postulaciones', 'usuarioId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    console.log('✅ Columna usuarioId revertida a NOT NULL con ON DELETE CASCADE');
  }
};
