"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar si la tabla ya existe
    let tableExists = true;
    try {
      await queryInterface.describeTable("preguntas_orientacion");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("preguntas_orientacion", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
        },
        codigo: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: "Código único de la pregunta (ej: KUDER-001, HOLLAND-R-001)",
        },
        tipo_test: {
          type: Sequelize.ENUM(
            "Kuder",
            "Holland_RIASEC",
            "Personalizado"
          ),
          allowNull: false,
          comment: "Tipo de test al que pertenece la pregunta",
        },
        dimension_principal: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment:
            "Dimensión principal RIASEC o Kuder (Realista, Investigador, Artístico, Social, Emprendedor, Convencional, o Mecánica, Cálculo, etc.)",
        },
        dimensiones_secundarias: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment:
            "Array de dimensiones que también puede activar esta pregunta",
        },
        texto_pregunta: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: "Texto completo de la pregunta",
        },
        tipo_pregunta: {
          type: Sequelize.ENUM(
            "directa",
            "comparativa",
            "situacional",
            "proyectiva"
          ),
          allowNull: false,
          defaultValue: "directa",
          comment:
            "Tipo de pregunta: directa, comparativa (elige entre opciones), situacional (imagina escenario), proyectiva",
        },
        peso: {
          type: Sequelize.ENUM("alta", "media", "baja"),
          allowNull: false,
          defaultValue: "media",
          comment:
            "Polarización de la pregunta: alta (muy polarizante), media, baja",
        },
        carreras_relacionadas: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Array de IDs de carreras relacionadas con esta pregunta",
        },
        correlaciones_academicas: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment:
            "Correlaciones con datos académicos (ej: {iaa_minimo: 15, asignaturas: ['Matemáticas']})",
        },
        efectividad_historica: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: true,
          defaultValue: 0.5,
          comment:
            "Tasa de discriminación histórica (0-1): qué tan bien predice el perfil",
        },
        veces_usada: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: "Contador de cuántas veces se ha usado esta pregunta",
        },
        veces_efectiva: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment:
            "Contador de cuántas veces predijo correctamente el perfil",
        },
        activa: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: "Si la pregunta está activa y disponible para usar",
        },
        version: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "1.0",
          comment: "Versión de la pregunta (para tracking de cambios)",
        },
        instrucciones: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Instrucciones específicas para esta pregunta si aplica",
        },
        opciones_respuesta: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment:
            "Opciones de respuesta para preguntas de opción múltiple (null para preguntas abiertas)",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });

      // Crear índices para optimizar consultas
      await queryInterface.addIndex("preguntas_orientacion", ["tipo_test", "dimension_principal"], {
        name: "idx_preguntas_tipo_dimension",
      });

      await queryInterface.addIndex("preguntas_orientacion", ["activa", "peso"], {
        name: "idx_preguntas_activa_peso",
      });

      await queryInterface.addIndex("preguntas_orientacion", ["efectividad_historica"], {
        name: "idx_preguntas_efectividad",
      });

      await queryInterface.addIndex("preguntas_orientacion", ["codigo"], {
        unique: true,
        name: "uq_preguntas_codigo",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar índices
    try {
      await queryInterface.removeIndex(
        "preguntas_orientacion",
        "idx_preguntas_tipo_dimension"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "preguntas_orientacion",
        "idx_preguntas_activa_peso"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "preguntas_orientacion",
        "idx_preguntas_efectividad"
      );
    } catch (e) {}

    try {
      await queryInterface.removeIndex(
        "preguntas_orientacion",
        "uq_preguntas_codigo"
      );
    } catch (e) {}

    // Eliminar tabla
    try {
      await queryInterface.dropTable("preguntas_orientacion");
    } catch (e) {}

    // Eliminar ENUMs (PostgreSQL)
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_preguntas_orientacion_tipo_test";'
      );
    } catch (e) {}

    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_preguntas_orientacion_tipo_pregunta";'
      );
    } catch (e) {}

    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_preguntas_orientacion_peso";'
      );
    } catch (e) {}
  },
};

