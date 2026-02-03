'use strict';

/**
 * Añade el valor 'ICO' a los ENUMs tipo_test (preguntas_orientacion,
 * sesiones_test_orientacion, resultados_orientacion) para el test ICO.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    const addEnumValue = async (typeName) => {
      try {
        await sequelize.query(`ALTER TYPE "${typeName}" ADD VALUE 'ICO';`);
      } catch (e) {
        if (e.message && e.message.includes('already exists')) return;
        console.warn(`No se pudo añadir ICO a ${typeName}:`, e.message);
      }
    };

    await addEnumValue('enum_preguntas_orientacion_tipo_test');
    await addEnumValue('enum_sesiones_test_orientacion_tipo_test');
    await addEnumValue('enum_resultados_orientacion_tipo_test');
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL no permite eliminar un valor de un enum sin recrear el tipo.
    console.log('Down: valor ICO permanece en los enums (limitación de PostgreSQL).');
  },
};
