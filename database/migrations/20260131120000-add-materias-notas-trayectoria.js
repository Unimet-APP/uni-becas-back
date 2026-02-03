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
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trayectorias_escolares', 'materias_por_ano_lapso');
    await queryInterface.removeColumn('trayectorias_escolares', 'materias_por_area');
  },
};
