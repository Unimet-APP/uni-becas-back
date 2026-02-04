'use strict';

/**
 * Añade a trayectorias_escolares:
 * - materias_por_ano_lapso: materias y notas por año (1-5) y lapso (1, 2, 3).
 *   Formato: { "1": { "1": [{ materia, nota }, ...], "2": [...], "3": [...] }, "2": { ... }, ... }
 * - materias_por_area: para graduados, materias y notas por área de formación.
 *   Formato: [{ area: "Matemática", materias: [{ nombre, nota }, ...] }, ...]
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si las columnas ya existen
    const tableDescription = await queryInterface.describeTable('trayectorias_escolares');

    if (!tableDescription.materias_por_ano_lapso) {
      await queryInterface.addColumn(
        'trayectorias_escolares',
        'materias_por_ano_lapso',
        {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Materias y notas por año (1-5) y lapso (1,2,3). Año -> Lapso -> [{ materia, nota }]',
        }
      );
      console.log('✅ Columna materias_por_ano_lapso creada');
    } else {
      console.log('ℹ️  Columna materias_por_ano_lapso ya existe');
    }

    if (!tableDescription.materias_por_area) {
      await queryInterface.addColumn(
        'trayectorias_escolares',
        'materias_por_area',
        {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: 'Materias y notas por área de formación (graduados). [{ area, materias: [{ nombre, nota }] }]',
        }
      );
      console.log('✅ Columna materias_por_area creada');
    } else {
      console.log('ℹ️  Columna materias_por_area ya existe');
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trayectorias_escolares', 'materias_por_ano_lapso');
    await queryInterface.removeColumn('trayectorias_escolares', 'materias_por_area');
  },
};
