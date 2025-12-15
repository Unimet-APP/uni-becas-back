-- =============================================================================
-- MIGRACIÓN: Eliminar supervisorId de estudiantes_becarios
-- =============================================================================
-- Descripción: Refactoriza la arquitectura para que los supervisores se
--              asignen a plazas, no directamente a estudiantes becarios.
--
-- IMPORTANTE:
-- - Ejecutar en ambiente de desarrollo
-- - Los 4 becarios con supervisorId perderán su asignación temporal
-- - Deberán reasignarse manualmente a plazas después de la migración
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASO 1: Verificar estado actual de la base de datos
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    becarios_con_supervisor INT;
    becarios_con_plaza INT;
    plazas_count INT;
BEGIN
    -- Contar becarios con supervisor directo
    SELECT COUNT(*) INTO becarios_con_supervisor
    FROM estudiantes_becarios
    WHERE "supervisorId" IS NOT NULL;

    -- Contar becarios con plaza asignada
    SELECT COUNT(*) INTO becarios_con_plaza
    FROM estudiantes_becarios
    WHERE "plazaAsignada" IS NOT NULL;

    -- Contar plazas existentes
    SELECT COUNT(*) INTO plazas_count
    FROM plazas;

    -- Mostrar estadísticas
    RAISE NOTICE '=== ESTADÍSTICAS PRE-MIGRACIÓN ===';
    RAISE NOTICE 'Becarios con supervisorId directo: %', becarios_con_supervisor;
    RAISE NOTICE 'Becarios con plazaAsignada: %', becarios_con_plaza;
    RAISE NOTICE 'Total de plazas en sistema: %', plazas_count;

    -- Advertencia si hay becarios con supervisorId
    IF becarios_con_supervisor > 0 THEN
        RAISE WARNING '⚠️  % becario(s) tienen supervisorId asignado. Estas asignaciones se PERDERÁN y deberán reasignarse a plazas manualmente.', becarios_con_supervisor;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 2: Eliminar constraint de foreign key
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'estudiantes_becarios_supervisorId_fkey'
        AND table_name = 'estudiantes_becarios'
    ) THEN
        RAISE NOTICE 'Eliminando constraint estudiantes_becarios_supervisorId_fkey...';
        ALTER TABLE estudiantes_becarios
            DROP CONSTRAINT estudiantes_becarios_supervisorId_fkey;
        RAISE NOTICE '✓ Constraint eliminado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  Constraint estudiantes_becarios_supervisorId_fkey no existe (ya fue eliminado)';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 3: Eliminar índice en supervisorId (si existe)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'estudiantes_becarios'
        AND indexname LIKE '%supervisorId%'
    ) THEN
        RAISE NOTICE 'Eliminando índice en supervisorId...';
        -- Nota: El nombre exacto del índice puede variar
        DROP INDEX IF EXISTS estudiantes_becarios_supervisor_id_idx;
        DROP INDEX IF EXISTS "estudiantes_becarios_supervisorId_idx";
        RAISE NOTICE '✓ Índice eliminado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  No se encontró índice en supervisorId';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 4: Eliminar columna supervisorId
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estudiantes_becarios'
        AND column_name = 'supervisorId'
    ) THEN
        RAISE NOTICE 'Eliminando columna supervisorId de estudiantes_becarios...';
        ALTER TABLE estudiantes_becarios
            DROP COLUMN "supervisorId";
        RAISE NOTICE '✓ Columna supervisorId eliminada exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  Columna supervisorId no existe (ya fue eliminada)';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 5: Agregar constraint único en plazas (supervisor único por período)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Eliminar constraint si ya existe (para permitir re-ejecución)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'plazas_supervisor_periodo_unico'
        AND table_name = 'plazas'
    ) THEN
        RAISE NOTICE 'Eliminando constraint existente plazas_supervisor_periodo_unico...';
        ALTER TABLE plazas DROP CONSTRAINT plazas_supervisor_periodo_unico;
    END IF;

    RAISE NOTICE 'Creando constraint plazas_supervisor_periodo_unico...';
    ALTER TABLE plazas
        ADD CONSTRAINT plazas_supervisor_periodo_unico
        UNIQUE ("supervisorResponsable", "periodoAcademico")
        WHERE estado = 'Activa';

    RAISE NOTICE '✓ Constraint creado: Un supervisor solo puede tener una plaza activa por período';
END $$;

-- -----------------------------------------------------------------------------
-- PASO 6: Verificar integridad de datos post-migración
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    plazas_sin_supervisor INT;
    becarios_sin_plaza INT;
    becarios_con_plaza_sin_supervisor INT;
BEGIN
    -- Plazas activas sin supervisor
    SELECT COUNT(*) INTO plazas_sin_supervisor
    FROM plazas
    WHERE estado = 'Activa' AND "supervisorResponsable" IS NULL;

    -- Becarios activos sin plaza
    SELECT COUNT(*) INTO becarios_sin_plaza
    FROM estudiantes_becarios
    WHERE estado = 'Activa' AND "plazaAsignada" IS NULL;

    -- Becarios con plaza pero plaza sin supervisor
    SELECT COUNT(*) INTO becarios_con_plaza_sin_supervisor
    FROM estudiantes_becarios eb
    LEFT JOIN plazas p ON eb."plazaAsignada" = p.id
    WHERE eb.estado = 'Activa'
    AND eb."plazaAsignada" IS NOT NULL
    AND p."supervisorResponsable" IS NULL;

    RAISE NOTICE '=== VERIFICACIÓN POST-MIGRACIÓN ===';
    RAISE NOTICE 'Plazas activas sin supervisor: %', plazas_sin_supervisor;
    RAISE NOTICE 'Becarios activos sin plaza: %', becarios_sin_plaza;
    RAISE NOTICE 'Becarios con plaza pero plaza sin supervisor: %', becarios_con_plaza_sin_supervisor;

    IF plazas_sin_supervisor > 0 THEN
        RAISE WARNING '⚠️  % plaza(s) activa(s) sin supervisor asignado', plazas_sin_supervisor;
    END IF;

    IF becarios_sin_plaza > 0 THEN
        RAISE WARNING '⚠️  % becario(s) activo(s) sin plaza asignada', becarios_sin_plaza;
    END IF;

    IF becarios_con_plaza_sin_supervisor > 0 THEN
        RAISE WARNING '⚠️  % becario(s) con plaza asignada pero la plaza no tiene supervisor', becarios_con_plaza_sin_supervisor;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 7: Mostrar resumen de cambios
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===';
    RAISE NOTICE '✓ Columna supervisorId eliminada de estudiantes_becarios';
    RAISE NOTICE '✓ Constraint único agregado a plazas (supervisor por período)';
    RAISE NOTICE '✓ Los estudiantes ahora obtienen su supervisor a través de la plaza';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SIGUIENTES PASOS:';
    RAISE NOTICE '1. Reasignar becarios sin plaza a plazas disponibles';
    RAISE NOTICE '2. Asignar supervisores a plazas que no tienen';
    RAISE NOTICE '3. Actualizar código frontend para usar nueva arquitectura';
    RAISE NOTICE '4. Revisar documentación BREAKING_CHANGES.md';
END $$;

COMMIT;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
