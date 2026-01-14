"use strict";

/**
 * Migración para corregir tipos ENUM en preguntas_orientacion
 * Si la tabla ya existe con tipos incorrectos, esta migración los corrige
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla existe
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'preguntas_orientacion'
      );`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0].exists) {
      console.log('ℹ️  Table preguntas_orientacion does not exist, skipping fix migration');
      return;
    }

    try {
      // Crear ENUMs si no existen
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_preguntas_orientacion_tipo_test" AS ENUM('Kuder', 'Holland_RIASEC', 'Personalizado');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_preguntas_orientacion_tipo_pregunta" AS ENUM('directa', 'comparativa', 'situacional', 'proyectiva');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_preguntas_orientacion_peso" AS ENUM('alta', 'media', 'baja');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      // Verificar el tipo actual de tipo_test
      const columnInfo = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'preguntas_orientacion' 
        AND column_name = 'tipo_test';
      `, { type: Sequelize.QueryTypes.SELECT });

      if (columnInfo.length > 0 && columnInfo[0].udt_name !== 'enum_preguntas_orientacion_tipo_test') {
        // Cambiar tipo_test a ENUM si no lo es
        await queryInterface.sequelize.query(`
          ALTER TABLE preguntas_orientacion 
          ALTER COLUMN tipo_test TYPE "enum_preguntas_orientacion_tipo_test" 
          USING CASE 
            WHEN tipo_test::text = 'Kuder' THEN 'Kuder'::"enum_preguntas_orientacion_tipo_test"
            WHEN tipo_test::text = 'Holland_RIASEC' THEN 'Holland_RIASEC'::"enum_preguntas_orientacion_tipo_test"
            WHEN tipo_test::text = 'Personalizado' THEN 'Personalizado'::"enum_preguntas_orientacion_tipo_test"
            ELSE 'Holland_RIASEC'::"enum_preguntas_orientacion_tipo_test"
          END;
        `);
        console.log('✅ Fixed tipo_test column type');
      }

      // Verificar y corregir tipo_pregunta
      const tipoPreguntaInfo = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'preguntas_orientacion' 
        AND column_name = 'tipo_pregunta';
      `, { type: Sequelize.QueryTypes.SELECT });

      if (tipoPreguntaInfo.length > 0 && tipoPreguntaInfo[0].udt_name !== 'enum_preguntas_orientacion_tipo_pregunta') {
        await queryInterface.sequelize.query(`
          ALTER TABLE preguntas_orientacion 
          ALTER COLUMN tipo_pregunta TYPE "enum_preguntas_orientacion_tipo_pregunta" 
          USING CASE 
            WHEN tipo_pregunta::text = 'directa' THEN 'directa'::"enum_preguntas_orientacion_tipo_pregunta"
            WHEN tipo_pregunta::text = 'comparativa' THEN 'comparativa'::"enum_preguntas_orientacion_tipo_pregunta"
            WHEN tipo_pregunta::text = 'situacional' THEN 'situacional'::"enum_preguntas_orientacion_tipo_pregunta"
            WHEN tipo_pregunta::text = 'proyectiva' THEN 'proyectiva'::"enum_preguntas_orientacion_tipo_pregunta"
            ELSE 'directa'::"enum_preguntas_orientacion_tipo_pregunta"
          END;
        `);
        console.log('✅ Fixed tipo_pregunta column type');
      }

      // Verificar y corregir peso
      const pesoInfo = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'preguntas_orientacion' 
        AND column_name = 'peso';
      `, { type: Sequelize.QueryTypes.SELECT });

      if (pesoInfo.length > 0 && pesoInfo[0].udt_name !== 'enum_preguntas_orientacion_peso') {
        await queryInterface.sequelize.query(`
          ALTER TABLE preguntas_orientacion 
          ALTER COLUMN peso TYPE "enum_preguntas_orientacion_peso" 
          USING CASE 
            WHEN peso::text = 'alta' THEN 'alta'::"enum_preguntas_orientacion_peso"
            WHEN peso::text = 'media' THEN 'media'::"enum_preguntas_orientacion_peso"
            WHEN peso::text = 'baja' THEN 'baja'::"enum_preguntas_orientacion_peso"
            ELSE 'media'::"enum_preguntas_orientacion_peso"
          END;
        `);
        console.log('✅ Fixed peso column type');
      }

      // Asegurar que el índice único en codigo existe
      const indexExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'preguntas_orientacion' 
          AND indexname = 'uq_preguntas_codigo'
        );
      `, { type: Sequelize.QueryTypes.SELECT });

      if (!indexExists[0].exists) {
        await queryInterface.addIndex('preguntas_orientacion', ['codigo'], {
          unique: true,
          name: 'uq_preguntas_codigo',
        });
        console.log('✅ Created unique index on codigo');
      }

      console.log('✅ Migration fix-preguntas-orientacion-enums completed successfully');
    } catch (error) {
      console.error('❌ Error in fix migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Esta migración es de corrección, no tiene down
    // Los tipos ENUM se mantienen
    console.log('⚠️  Fix migration has no down migration');
  },
};
