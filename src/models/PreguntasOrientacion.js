"use strict";
const { Model } = require('DataTypes');

module.exports = (sequelize, DataTypes) => {
    class PreguntasOrientacion extends Model {
    
        static associate(models) {
            PreguntasOrientacion.hasMany(models.RespuestasTestOrientacion, { foreignKey: 'pregunta_id' });
        }
    }

        PreguntasOrientacion.init({
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: DataTypes.literal('gen_random_uuid()'),
              },
              codigo_pregunta: {
                type: DataTypes.STRING(50),
                allowNull:false,
                comment: 'Código único para la pregunta',
              },
              tipo_test: {
                type: DataTypes.ENUM('Kuder', 'Holland_RIASEC','Personalizado'),
                allowNull:false,
                comment: 'Tipo de test al que pertenece la pregunta',
              },
              dimension_principal: {
                type: DataTypes.STRING(50),
                allowNull:false,
              },
              dimension_secundaria: {
                type: DataTypes.JSONB,
                allowNull:true,
                defaultValue: [],
                comment: 'Dimensiones secundarias de la pregunta',
              },
              texto__pregunta:{
                type: DataTypes.TEXT,
                allowNull:false,
                comment: 'Texto de la pregunta',
              },
              tipo_pregunta: {
                type: DataTypes.ENUM('directa','comparativa','situacional','proyectiva'),
                allowNull:false,
                defaultValue: 'directa',
                comment: 'Tipo de pregunta',
              },
              peso_pregunta:{
                type: DataTypes.ENUM('alta','media','baja'),
                allowNull:false,
                defaultValue: 'media',
                comment: 'Peso de la pregunta'
              },
              carreras_relacionadas: {
                type: DataTypes.JSONB,
                allowNull:true,
                defaultValue: [],
              },
              correlaciones_academicas: {
                type: DataTypes.JSONB,
                allowNull:true,
                defaultValue: [],
              },
              efectividad_historica:{
                type: DataTypes.DECIMAL(4,2),
                allowNull:true,
                defaultValue: 0.00,
        
              },
              veces_usada:{
                type: DataTypes.INTEGER,
                allowNull:false,
                defaultValue: 0,
              },
              veces_efectiva:{
                type: DataTypes.INTEGER,
                allowNull:false,
                defaultValue: 0,
              },
              activa:{
                type: DataTypes.BOOLEAN,
                allowNull:false,
                defaultValue: true,
              },
              version: {
                type: DataTypes.INTEGER,
                allowNull:false,
                defaultValue: 1,
              },
              instrucciones_pregunta: {
                type: DataTypes.TEXT,
                allowNull:true,
              },
              instrucciones_respuesta: {
                type: DataTypes.JSONB,
                allowNull:true,
                defaultValue: [],
                comment: 'Instrucciones de la respuesta',
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
      return PreguntasOrientacion;

};