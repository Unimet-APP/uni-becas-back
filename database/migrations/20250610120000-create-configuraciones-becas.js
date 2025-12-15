'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('configuraciones_becas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tipoBeca: {
        type: Sequelize.ENUM(
          'Ayudantía',
          'Impacto',
          'Excelencia',
          'Exoneración de Pago',
          'Formación Docente'
        ),
        allowNull: false,
        comment: 'Tipo de beca'
      },
      subtipoExcelencia: {
        type: Sequelize.ENUM(
          'Académica',
          'Deportiva',
          'Artística',
          'Emprendimiento',
          'Cívico'
        ),
        allowNull: true,
        comment: 'Subtipo de beca de excelencia (solo aplica cuando tipoBeca = Excelencia)'
      },
      // Información Básica
      montoMensual: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto mensual del beneficio en moneda local'
      },
      cuposDisponibles: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Número total de cupos disponibles para esta beca'
      },
      duracionMeses: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duración de la beca en meses'
      },
      // Requisitos Académicos
      promedioMinimo: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Promedio académico mínimo requerido (escala 0-20)'
      },
      semestreMinimo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Semestre mínimo para postular'
      },
      semestreMaximo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Semestre máximo para postular (opcional)'
      },
      edadMaxima: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Edad máxima para postular'
      },
      // Requisitos Especiales
      requisitosEspeciales: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción detallada de requisitos especiales adicionales'
      },
      // Documentos Requeridos
      documentosRequeridos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Lista de documentos requeridos para postular a esta beca'
      },
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Crear índice único compuesto para tipoBeca + subtipoExcelencia
    await queryInterface.addIndex('configuraciones_becas', ['tipoBeca', 'subtipoExcelencia'], {
      unique: true,
      name: 'configuraciones_becas_tipo_subtipo_unique'
    });

    // Crear índice para tipoBeca
    await queryInterface.addIndex('configuraciones_becas', ['tipoBeca'], {
      name: 'configuraciones_becas_tipo_beca_idx'
    });

    // Agregar constraint para validar que si tipoBeca = 'Excelencia', subtipoExcelencia debe ser NOT NULL
    await queryInterface.sequelize.query(`
      ALTER TABLE configuraciones_becas
      ADD CONSTRAINT check_subtipo_excelencia
      CHECK (
        ("tipoBeca" = 'Excelencia' AND "subtipoExcelencia" IS NOT NULL) OR
        ("tipoBeca" != 'Excelencia' AND "subtipoExcelencia" IS NULL)
      );
    `);

    // Agregar constraints para validaciones de rangos
    await queryInterface.sequelize.query(`
      ALTER TABLE configuraciones_becas
      ADD CONSTRAINT check_monto_mensual CHECK ("montoMensual" IS NULL OR "montoMensual" >= 0),
      ADD CONSTRAINT check_cupos_disponibles CHECK ("cuposDisponibles" IS NULL OR "cuposDisponibles" >= 0),
      ADD CONSTRAINT check_duracion_meses CHECK ("duracionMeses" IS NULL OR ("duracionMeses" >= 1 AND "duracionMeses" <= 12)),
      ADD CONSTRAINT check_promedio_minimo CHECK ("promedioMinimo" IS NULL OR ("promedioMinimo" >= 0 AND "promedioMinimo" <= 20)),
      ADD CONSTRAINT check_semestre_minimo CHECK ("semestreMinimo" IS NULL OR ("semestreMinimo" >= 1 AND "semestreMinimo" <= 20)),
      ADD CONSTRAINT check_semestre_maximo CHECK ("semestreMaximo" IS NULL OR ("semestreMaximo" >= 1 AND "semestreMaximo" <= 20)),
      ADD CONSTRAINT check_edad_maxima CHECK ("edadMaxima" IS NULL OR ("edadMaxima" >= 16 AND "edadMaxima" <= 65)),
      ADD CONSTRAINT check_semestre_minimo_maximo CHECK (
        "semestreMaximo" IS NULL OR "semestreMinimo" IS NULL OR "semestreMaximo" >= "semestreMinimo"
      );
    `);

    console.log('✅ Tabla configuraciones_becas creada con todos sus índices y constraints');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar la tabla (esto automáticamente elimina todos los índices y constraints)
    await queryInterface.dropTable('configuraciones_becas');

    // Eliminar los ENUMs creados
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_configuraciones_becas_tipoBeca";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_configuraciones_becas_subtipoExcelencia";');

    console.log('✅ Tabla configuraciones_becas y sus ENUMs eliminados');
  }
};
