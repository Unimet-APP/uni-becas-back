"use strict";
const { Model } = require('DataTypes');

module.exports = (sequelize, DataTypes) => {
    class TrayectoriasEscolares extends Model {
    
        static associate(models) {
            TrayectoriasEscolares.belongsTo(models.Usuarios, { foreignKey: 'usuario_id' });
        }
    }

        TrayectoriasEscolares.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.literal("gen_random_uuid()"),
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
      
              // 2. DATOS DE TU INTERFAZ (Imagen)
              promedios_por_ano: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                comment: "Guarda los inputs de tu pantalla: { '1ero': 16.5, '2do': 17.0 }",
              },
              promedio_general_acumulado: {
                type: DataTypes.DECIMAL(4, 2),
                allowNull: true,
                comment: "Promedio total de todos los años cursados",
              },
      
              // 3. INFORMACIÓN ESCOLAR
              grado_actual: {
                type: DataTypes.STRING(50),
                allowNull: true,
                comment: "Año que cursa actualmente (ej: 5to Año)",
              },
              materias_destacadas: {
                type: DataTypes.JSONB,
                allowNull: true,
                defaultValue: [],
                comment: "Materias donde el alumno rinde mejor según su autopercepción",
              },
      
              // 4. ACTIVIDADES Y PROYECTOS
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
      
              // 5. ESTADO Y AUDITORÍA
              es_actual: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
              },
              fecha_registro: {
                type: DataTypes.DATEONLY,
                allowNull: false,
                defaultValue: DataTypes.literal("CURRENT_DATE"),
              },
              created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.literal("NOW()"),
              },
              updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.literal("NOW()"),
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