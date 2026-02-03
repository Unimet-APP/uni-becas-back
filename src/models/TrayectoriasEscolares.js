"use strict";
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrayectoriasEscolares extends Model {
    static associate(models) {
      TrayectoriasEscolares.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    }
  }

  TrayectoriasEscolares.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: sequelize.literal("gen_random_uuid()"),
        allowNull: false,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      promedios_por_ano: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      promedio_general_acumulado: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      grado_actual: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      materias_destacadas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      actividades_extracurriculares: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      proyectos_realizados: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      materias_por_ano_lapso: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Materias y notas por año (1-5) y lapso (1,2,3). Año -> Lapso -> [{ materia, nota }]',
      },
      materias_por_area: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Materias y notas por área de formación (graduados). [{ area, materias: [{ nombre, nota }] }]',
      },
      es_actual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_DATE"),
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
      // CORRECCIÓN: El nombre debe ser el de este modelo
      modelName: 'TrayectoriasEscolares',
      tableName: 'trayectorias_escolares',
      timestamps: true,
      underscored: true,
    }
  );

  // CORRECCIÓN: Retornar la clase que definiste arriba
  return TrayectoriasEscolares;
};