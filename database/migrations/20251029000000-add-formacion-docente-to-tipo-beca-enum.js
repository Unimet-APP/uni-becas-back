'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si el valor ya existe en el ENUM antes de agregarlo
    const [results] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_configuraciones_becas_tipoBeca'
        AND e.enumlabel = 'Formación Docente'
      ) as exists;
    `);

    const enumValueExists = results[0].exists;

    if (!enumValueExists) {
      // Agregar 'Formación Docente' al ENUM de tipoBeca
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_configuraciones_becas_tipoBeca" ADD VALUE 'Formación Docente';
      `);

      console.log('✅ Valor "Formación Docente" agregado al ENUM enum_configuraciones_becas_tipoBeca');
    } else {
      console.log('ℹ️  El valor "Formación Docente" ya existe en el ENUM enum_configuraciones_becas_tipoBeca');
    }
  },

  async down(queryInterface, Sequelize) {
    // NOTA: PostgreSQL no permite eliminar valores de un ENUM directamente
    // La única forma es recrear el ENUM sin ese valor, lo cual requiere:
    // 1. Crear un nuevo ENUM sin 'Formación Docente'
    // 2. Alterar la columna para usar el nuevo ENUM
    // 3. Eliminar el ENUM antiguo
    // 4. Renombrar el nuevo ENUM

    console.log('⚠️  ADVERTENCIA: La reversión de esta migración requiere recrear el ENUM.');
    console.log('⚠️  Esto puede causar problemas si hay datos existentes con tipoBeca = "Formación Docente".');
    console.log('⚠️  Por seguridad, esta operación debe realizarse manualmente si es necesario.');

    // Para revertir manualmente, ejecutar:
    // 1. Eliminar todas las filas con tipoBeca = 'Formación Docente'
    // 2. Crear nuevo ENUM sin ese valor
    // 3. Alterar la tabla para usar el nuevo ENUM
    // 4. Eliminar el ENUM antiguo

    // Si estás seguro de que no hay datos con 'Formación Docente', puedes descomentar:
    /*
    await queryInterface.sequelize.query(`
      -- Crear nuevo ENUM sin 'Formación Docente'
      CREATE TYPE "enum_configuraciones_becas_tipoBeca_new" AS ENUM (
        'Ayudantía',
        'Impacto',
        'Excelencia',
        'Exoneración de Pago'
      );

      -- Alterar la columna para usar el nuevo ENUM
      ALTER TABLE configuraciones_becas
        ALTER COLUMN "tipoBeca" TYPE "enum_configuraciones_becas_tipoBeca_new"
        USING "tipoBeca"::text::"enum_configuraciones_becas_tipoBeca_new";

      -- Eliminar el ENUM antiguo
      DROP TYPE "enum_configuraciones_becas_tipoBeca";

      -- Renombrar el nuevo ENUM
      ALTER TYPE "enum_configuraciones_becas_tipoBeca_new" RENAME TO "enum_configuraciones_becas_tipoBeca";
    `);

    console.log('✅ Valor "Formación Docente" eliminado del ENUM enum_configuraciones_becas_tipoBeca');
    */
  }
};
