// src/models/Career.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Career = sequelize.define(
    "Career",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(30), allowNull: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      faculty: { type: DataTypes.STRING(120), allowNull: false },
      area: { type: DataTypes.STRING(120), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      profile: { type: DataTypes.TEXT, allowNull: true },
      job_field: { type: DataTypes.TEXT, allowNull: true },
      duration: { type: DataTypes.STRING(50), allowNull: true },
      modality: { type: DataTypes.STRING(50), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "careers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return Career;
};