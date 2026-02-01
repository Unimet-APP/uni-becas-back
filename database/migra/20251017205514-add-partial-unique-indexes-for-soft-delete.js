'use strict';

/**
 * MIGRACIÓN: Implementar Partial Unique Indexes para Soft Deletes
 *
 * PROBLEMA:
 * Con soft delete (deletedAt), los constraints UNIQUE tradicionales impiden
 * que usuarios eliminados puedan re-registrarse con el mismo email/cédula.
 *
 * SOLUCIÓN:
 * Usar Partial Unique Indexes que solo aplican a usuarios activos (deletedAt IS NULL).
 * Esto permite:
 * - Solo UN usuario activo por email/cédula
 * - Múltiples usuarios eliminados con mismo email/cédula (historial)
 * - Re-registros después de eliminación
 *
 * EJEMPLO:
 * Tabla usuarios después de la migración:
 * ┌──────────────────┬─────────────┬────────────┐
 * │ email            │ deletedAt   │ Permitido  │
 * ├──────────────────┼─────────────┼────────────┤
 * │ user@domain.com  │ 2025-01-01  │ ✅ Historial│
 * │ user@domain.com  │ 2025-06-15  │ ✅ Historial│
 * │ user@domain.com  │ NULL        │ ✅ ACTIVO   │
 * │ user@domain.com  │ NULL        │ ❌ ERROR    │ ← Bloqueado por partial unique index
 * └──────────────────┴─────────────┴────────────┘
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    console.log('🔧 Iniciando migración: Partial Unique Indexes para Soft Delete');

    // 1. Eliminar TODOS los constraints UNIQUE de email
    console.log('📝 Paso 1/4: Eliminando constraints UNIQUE de email...');
    await sequelize.query(`
      DO $$
      DECLARE
          constraint_name TEXT;
      BEGIN
          FOR constraint_name IN
              SELECT conname
              FROM pg_constraint
              WHERE conrelid = 'usuarios'::regclass
              AND contype = 'u'
              AND conname LIKE '%email%'
          LOOP
              EXECUTE 'ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
          END LOOP;
      END $$;
    `);

    // 2. Eliminar TODOS los constraints UNIQUE de cedula
    console.log('📝 Paso 2/4: Eliminando constraints UNIQUE de cédula...');
    await sequelize.query(`
      DO $$
      DECLARE
          constraint_name TEXT;
      BEGIN
          FOR constraint_name IN
              SELECT conname
              FROM pg_constraint
              WHERE conrelid = 'usuarios'::regclass
              AND contype = 'u'
              AND conname LIKE '%cedula%'
          LOOP
              EXECUTE 'ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
          END LOOP;
      END $$;
    `);

    // 3. Eliminar índices UNIQUE sin condición
    console.log('📝 Paso 3/4: Eliminando índices UNIQUE antiguos...');
    await sequelize.query('DROP INDEX IF EXISTS usuarios_email');
    await sequelize.query('DROP INDEX IF EXISTS usuarios_cedula');

    // 4. Crear Partial Unique Indexes
    console.log('📝 Paso 4/4: Creando Partial Unique Indexes...');

    // Partial Unique Index para email (solo usuarios activos)
    await sequelize.query(`
      CREATE UNIQUE INDEX usuarios_email_active_unique
      ON usuarios(email)
      WHERE "deletedAt" IS NULL
    `);

    // Partial Unique Index para cedula (solo usuarios activos)
    await sequelize.query(`
      CREATE UNIQUE INDEX usuarios_cedula_active_unique
      ON usuarios(cedula)
      WHERE "deletedAt" IS NULL
    `);

    console.log('✅ Migración completada exitosamente!');
    console.log('📊 Usuarios ahora pueden re-registrarse después de eliminación.');
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    console.log('🔄 Revirtiendo migración: Partial Unique Indexes');

    // 1. Eliminar partial unique indexes
    console.log('📝 Paso 1/2: Eliminando Partial Unique Indexes...');
    await sequelize.query('DROP INDEX IF EXISTS usuarios_email_active_unique');
    await sequelize.query('DROP INDEX IF EXISTS usuarios_cedula_active_unique');

    // 2. Recrear constraints UNIQUE tradicionales
    console.log('📝 Paso 2/2: Recreando constraints UNIQUE tradicionales...');

    // ADVERTENCIA: Esto fallará si existen usuarios eliminados con emails/cédulas duplicadas
    await sequelize.query(`
      CREATE UNIQUE INDEX usuarios_email
      ON usuarios(email)
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX usuarios_cedula
      ON usuarios(cedula)
    `);

    console.log('✅ Reversión completada.');
    console.log('⚠️  NOTA: Re-registros ya no serán posibles.');
  }
};
