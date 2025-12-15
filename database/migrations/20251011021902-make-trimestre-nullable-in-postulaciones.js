'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hacer el campo trimestre nullable
    await queryInterface.changeColumn('postulaciones', 'trimestre', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    console.log('✅ Columna trimestre ahora es nullable');
  },

  async down(queryInterface, Sequelize) {
    // Revertir: hacer trimestre obligatorio de nuevo
    // NOTA: Esto fallará si hay registros con trimestre NULL
    await queryInterface.changeColumn('postulaciones', 'trimestre', {
      type: Sequelize.STRING(10),
      allowNull: false
    });

    console.log('✅ Columna trimestre revertida a NOT NULL');
  }
};
