'use strict';

/**
 * Agrega columna valor_likert (INTEGER, nullable) a respuestas_test_orientacion.
 * Se usa para el test ICO con escala Likert de 3 niveles:
 *   2 = Frecuentemente, 1 = A veces, 0 = Nunca.
 * Para Holland RIASEC la columna queda NULL (se sigue usando respuesta BOOLEAN).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('respuestas_test_orientacion', 'valor_likert', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Valor Likert: 2=Frecuentemente, 1=A veces, 0=Nunca (solo ICO)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('respuestas_test_orientacion', 'valor_likert');
  },
};
