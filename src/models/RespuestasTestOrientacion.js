"use strict";
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class RespuestasTestOrientacion extends Model {
    
        static associate(models) {
            RespuestasTestOrientacion.belongsTo(models.SesionesTestOrientacion, { foreignKey: 'sesion_id', as: 'sesion' });
            RespuestasTestOrientacion.belongsTo(models.PreguntasOrientacion, { foreignKey: 'pregunta_id', as: 'pregunta' });
            RespuestasTestOrientacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
        }
    }

        RespuestasTestOrientacion.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: sequelize.literal('gen_random_uuid()'),
              },
              sesion_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                  model: 'sesiones_test_orientacion',
                  key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
              },
              pregunta_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                  model: 'preguntas_orientacion',
                  key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
              ronda: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Ronda del test',
              },
              respuesta: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                comment: 'Respuesta de la pregunta',
              },
              respuesta_correcta: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                comment: 'Respuesta correcta de la pregunta',
              },
              dimension_predicha: {
                type: DataTypes.STRING(50),
                allowNull: false,
                comment: 'Dimensión predicha de la pregunta',
              },
              tiempo_respuesta: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Tiempo de respuesta de la pregunta',
              },
              nivel_seguridad: {
                type: DataTypes.ENUM('seguro','no_seguro'),
                allowNull: false,
                comment: 'Nivel de seguridad de la respuesta',
              },
              time_stamp_respuesta: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize.literal('NOW()'),
                comment: 'Timestamp de la respuesta',
              },
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
        },
        {
            sequelize,
            modelName: 'RespuestasTestOrientacion',
            tableName: 'respuestas_test_orientacion',
            timestamps: true,
            underscored: true,
        }
    );
      return RespuestasTestOrientacion;

};