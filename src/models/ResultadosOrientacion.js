"use strict";
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ResultadosOrientacion extends Model {
        static associate(models) {
            ResultadosOrientacion.belongsTo(models.SesionesTestOrientacion, { foreignKey: 'sesion_id', as: 'sesion' });
            ResultadosOrientacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
        }
    }

    ResultadosOrientacion.init({
            // 1. IDENTIFICACIÓN Y VÍNCULOS
            id: {
            type: DataTypes.UUID,
            defaultValue: sequelize.literal("gen_random_uuid()"),
            allowNull: false,
            primaryKey: true,
            },
            sesion_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: { model: "sesiones_test_orientacion", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
            },
            usuario_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: "usuarios", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
            },

            // 2. DATOS TÉCNICOS DEL TEST
            tipo_test: {
            type: DataTypes.ENUM("Kuder", "Holland_RIASEC", "ICO"),
            allowNull: false,
            },
            puntuaciones_finales: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
            },
            codigo_holland: { type: DataTypes.STRING(10), allowNull: true },
            perfil_dominante: { type: DataTypes.STRING(50), allowNull: true },
            perfil_secundario: { type: DataTypes.STRING(50), allowNull: true },
            nivel_confianza_general: { type: DataTypes.DECIMAL(4, 2), allowNull: true },

            // 3. CAPA DE INTELIGENCIA ARTIFICIAL (LLM)
            analisis_llm: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            },
            recomendaciones_carreras: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            },
            perfil_vocacional: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            },

            // 4. ANÁLISIS ACADÉMICO Y SEGUIMIENTO
            trayectoria_academica_analizada: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            },
            areas_desarrollo: { type: DataTypes.JSONB, defaultValue: [] },
            sugerencias_acompanamiento: { type: DataTypes.JSONB, defaultValue: [] },
            plan_desarrollo: { type: DataTypes.JSONB, defaultValue: {} },
            factor_correccion_aplicado: { type: DataTypes.JSONB, defaultValue: {} },

            // 5. AUDITORÍA Y CONTROL
            version_analisis: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "1.0",
            },
            fecha_generacion: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("NOW()"),
            },
            created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("NOW()"),
            },
            updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("NOW()"),
            },
        },
        {
            sequelize,
            modelName: 'ResultadosOrientacion',
            tableName: 'resultados_orientacion',
            timestamps: true,
            underscored: true,
        }
    );

    return ResultadosOrientacion;
};