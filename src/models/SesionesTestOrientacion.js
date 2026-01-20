"use strict";
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SesionesTestOrientacion extends Model {
        static associate(models) {
            SesionesTestOrientacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
            SesionesTestOrientacion.hasMany(models.ResultadosOrientacion, { foreignKey: 'sesion_id', as: 'resultado' });
            SesionesTestOrientacion.hasMany(models.RespuestasTestOrientacion, { foreignKey: 'sesion_id', as: 'respuestas' });
        }
    }

    SesionesTestOrientacion.init({
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: sequelize.literal('gen_random_uuid()'),
        },
        usuario_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'usuarios',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        tipo_test: {
            type: DataTypes.ENUM('Holland_RIASEC', 'Kuder'),
            allowNull: false,
            defaultValue: 'Holland_RIASEC',
        },
        estado: {
            type: DataTypes.ENUM('iniciada', 'ronda_1_completada', 'ronda_2_completada', 'finalizada', 'abandonada'),
        },
        seed_aleatorio: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        fecha_inicio: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('NOW()'),
        },
        fecha_ronda_1: { type: DataTypes.DATE, allowNull: true },
        fecha_ronda_2: { type: DataTypes.DATE, allowNull: true },
        fecha_completada: { type: DataTypes.DATE, allowNull: true },
        preguntas_ronda_1: { type: DataTypes.JSONB, allowNull: true },
        preguntas_ronda_2: { type: DataTypes.JSONB, allowNull: true },
        puntuaciones_ronda_1: { type: DataTypes.JSONB, allowNull: true },
        puntuaciones_ronda_2: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
        nivel_confianza_ronda_1: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
        nivel_confianza_ronda_2: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
        areas_ambiguedad: { type: DataTypes.JSONB, allowNull: true },
        discrepancias: { type: DataTypes.JSONB, allowNull: true },
        tiempo_total_segyndos: { type: DataTypes.INTEGER, allowNull: true },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('NOW()'),
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('NOW()'),
        },
    }, {
        sequelize,
        // CORRECCIÓN CLAVE: El modelName debe ser igual al nombre de la clase
        modelName: 'SesionesTestOrientacion', 
        tableName: 'sesiones_test_orientacion',
        timestamps: true,
        underscored: true,
    });

    return SesionesTestOrientacion;
};