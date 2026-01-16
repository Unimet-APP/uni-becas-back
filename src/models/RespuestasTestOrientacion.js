"use strict";
const { Model } = require('DataTypes');

module.exports = (sequelize, DataTypes) => {
    class RespuestasTestOrientacion extends Model {
    
        static associate(models) {
            RespuestasTestOrientacion.belongsTo(models.SesionesTestOrientacion, { foreignKey: 'sesion_id' });
            RespuestasTestOrientacion.belongsTo(models.PreguntasOrientacion, { foreignKey: 'pregunta_id' });
            RespuestasTestOrientacion.belongsTo(models.Usuarios, { foreignKey: 'usuario_id' });
        }
    }

        RespuestasTestOrientacion.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: DataTypes.literal('gen_random_uuid()'),
              },
              sesionId: {
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
                defaultValue: DataTypes.literal('NOW()'),
                comment: 'Timestamp de la respuesta',
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
            modelName: 'RespuestasTestOrientacion',
            tableName: 'respuestas_test_orientacion',
            timestamps: true,
            underscored: true,
        }
    );
      return RespuestasTestOrientacion;

};