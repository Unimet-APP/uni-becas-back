"use strict";
const { Model } = require('DataTypes');

module.exports = (sequelize, DataTypes) => {
    class SesionesTestOrientacion extends Model {
    
        static associate(models) {
            SesionesTestOrientacion.belongsTo(models.Usuarios, { foreignKey: 'usuario_id' });
            SesionesTestOrientacion.hasMany(models.ResultadosOrientacion, { foreignKey: 'sesion_id' });
            SesionesTestOrientacion.hasMany(models.RespuestasTestOrientacion, { foreignKey: 'sesion_id' });
        }
    }

        SesionesTestOrientacion.init({
            id: {
                type:DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: DataTypes.literal('gen_random_uuid()'),
              },
              usuarioId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                  model: 'usuarios',
                  key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
              },
              tipoTest: {
                type: DataTypes.ENUM('Holland_RIASEC','Kuder'),
                allowNull: false,
                defaultValue: 'Holland_RIASEC',
                comment: 'Tipo de test',
              },
              estado: {
                type: DataTypes.ENUM('iniciada','ronda_1_completada','ronda_2_completada','finalizada','abandonada'),
              },
              seed_aleatorio:{
                type: DataTypes.STRING(50),
                allowNull: false,
                comment: 'Seed aleatorio para la sesión',
              },
              fecha_inicio: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.literal('NOW()'),
                comment: 'Fecha de inicio de la sesión',
              },
              fecha_ronda_1: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Fecha de inicio de la ronda 1',
              },
              fecha_ronda_2: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Fecha de inicio de la ronda 2',
              },
              fecha_completada: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Fecha de completado de la sesión',
              },
              preguntas_ronda_1: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Preguntas de la ronda 1',
              },
              preguntas_ronda_2: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Preguntas de la ronda 2',
              },
              puntuaciones_ronda_1: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Respuestas de la ronda 1',
              },
              puntuaciones_ronda_2: {
                defaultValue: [],
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Respuestas de la ronda 2',
              },
              nivel_confianza_ronda_1: {
                type: DataTypes.DECIMAL(4,2),
                allowNull: true,
                comment: 'Nivel de confianza de la ronda 1',
              },
              nivel_confianza_ronda_2: {
                type: DataTypes.DECIMAL(4,2),
                allowNull: true,
                comment: 'Nivel de confianza de la ronda 2',
              },
              areas_ambiguedad: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Areas de ambiguedad',
              },
              discrepancias: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Discrepancias',
              },
              tiempo_total_segyndos: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Tiempo total de la sesión en segundos',
              },
              created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.literal('NOW()'),
              },
              updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.literal('NOW()'),
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
      return SesionesTestOrientacion;

};