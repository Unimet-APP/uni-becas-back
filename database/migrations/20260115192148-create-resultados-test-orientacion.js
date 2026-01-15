"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- SEGURIDAD: VERIFICAR EXISTENCIA ---
    let tableExists = true;
    try {
      await queryInterface.describeTable("resultados_orientacion");
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      // --- CREACIÓN DE TABLA ---
      await queryInterface.createTable("resultados_orientacion", {
        
        // 1. IDENTIFICACIÓN Y VÍNCULOS
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
          allowNull: false,
          primaryKey: true,
        },
        sesion_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: { model: "sesiones_test_orientacion", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        usuario_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "usuarios", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },

        // 2. DATOS TÉCNICOS DEL TEST
        tipo_test: {
          type: Sequelize.ENUM("Kuder", "Holland_RIASEC"),
          allowNull: false,
        },
        puntuaciones_finales: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        codigo_holland: { type: Sequelize.STRING(10), allowNull: true },
        perfil_dominante: { type: Sequelize.STRING(50), allowNull: true },
        perfil_secundario: { type: Sequelize.STRING(50), allowNull: true },
        nivel_confianza_general: { type: Sequelize.DECIMAL(4, 2), allowNull: true },

        // 3. CAPA DE INTELIGENCIA ARTIFICIAL (LLM)
        analisis_llm: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        recomendaciones_carreras: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        perfil_vocacional: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },

        // 4. ANÁLISIS ACADÉMICO Y SEGUIMIENTO
        trayectoria_academica_analizada: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        areas_desarrollo: { type: Sequelize.JSONB, defaultValue: [] },
        sugerencias_acompanamiento: { type: Sequelize.JSONB, defaultValue: [] },
        plan_desarrollo: { type: Sequelize.JSONB, defaultValue: {} },
        factor_correccion_aplicado: { type: Sequelize.JSONB, defaultValue: {} },

        // 5. AUDITORÍA Y CONTROL
        version_analisis: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "1.0",
        },
        fecha_generacion: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
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

      // --- ÍNDICES PARA REPORTES ---
      await queryInterface.addIndex("resultados_orientacion", ["usuario_id"], { name: "idx_resultados_usuario" });
      await queryInterface.addIndex("resultados_orientacion", ["fecha_generacion"], { name: "idx_resultados_fecha" });
      await queryInterface.addIndex("resultados_orientacion", ["codigo_holland"], { name: "idx_resultados_holland" });
      await queryInterface.addIndex("resultados_orientacion", ["tipo_test"], { name: "idx_resultados_tipo_test" });
    }
  },

  async down(queryInterface, Sequelize) {
    // ELIMINACIÓN DE SEGURIDAD
    await queryInterface.dropTable("resultados_orientacion");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_resultados_orientacion_tipo_test";');
  },
};