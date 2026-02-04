module.exports = (sequelize, DataTypes) => {
  const CitasOrientacion = sequelize.define('CitasOrientacion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    estudiante_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID del estudiante que recibe la orientación'
    },
    especialista_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID del especialista que agenda la cita'
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha de la cita'
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Hora de la cita'
    },
    modalidad: {
      type: DataTypes.ENUM('presencial', 'virtual', 'telefonica'),
      defaultValue: 'presencial',
      comment: 'Modalidad de la cita'
    },
    motivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Motivo de la cita'
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la cita'
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'confirmada', 'completada', 'cancelada'),
      defaultValue: 'pendiente',
      comment: 'Estado de la cita'
    },
    notas_seguimiento: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas de seguimiento después de la cita'
    }
  }, {
    tableName: 'citas_orientacion',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    indexes: [
      {
        fields: ['estudiante_id']
      },
      {
        fields: ['especialista_id']
      },
      {
        fields: ['fecha']
      },
      {
        fields: ['estado']
      }
    ]
  });

  CitasOrientacion.associate = function(models) {
    CitasOrientacion.belongsTo(models.Usuario, {
      foreignKey: 'estudiante_id',
      as: 'estudiante'
    });
    CitasOrientacion.belongsTo(models.Usuario, {
      foreignKey: 'especialista_id',
      as: 'especialista'
    });
  };

  return CitasOrientacion;
};
