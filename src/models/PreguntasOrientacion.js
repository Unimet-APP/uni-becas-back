"use strict";
// CORRECCIÓN: Se importa Model desde 'sequelize'
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PreguntasOrientacion extends Model {
    static associate(models) {
      // Relación con respuestas
      PreguntasOrientacion.hasMany(models.RespuestasTestOrientacion, { 
        foreignKey: 'pregunta_id',
        as: 'respuestas' 
      });
    }
  }

  PreguntasOrientacion.init(
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: sequelize.literal('gen_random_uuid()'),
      },
      codigo_pregunta: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Código único para la pregunta',
      },
      tipo_test: {
        type: DataTypes.ENUM('Kuder', 'Holland_RIASEC', 'Personalizado', 'ICO'),
        allowNull: false,
      },
      dimension_principal: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      dimension_secundaria: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      texto__pregunta: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tipo_pregunta: {
        type: DataTypes.ENUM('directa', 'comparativa', 'situacional', 'proyectiva'),
        allowNull: false,
        defaultValue: 'directa',
      },
      peso_pregunta: {
        type: DataTypes.ENUM('alta', 'media', 'baja'),
        allowNull: false,
        defaultValue: 'media',
      },
      carreras_relacionadas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      correlaciones_academicas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      instrucciones_pregunta: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      instrucciones_respuesta: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      efectividad_historica: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0.00,
      },
      veces_usada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      veces_efectiva: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
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
      // CORRECCIÓN: El nombre del modelo debe coincidir con la clase
      modelName: 'PreguntasOrientacion', 
      tableName: 'preguntas_orientacion',
      timestamps: true,
      underscored: true,
    }
  );

  return PreguntasOrientacion;
};