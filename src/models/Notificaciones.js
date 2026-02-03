module.exports = (sequelize, DataTypes) => {
  const Notificaciones = sequelize.define('Notificaciones', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID del usuario que recibe la notificación'
    },
    titulo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Título de la notificación'
    },
    contenido: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Contenido descriptivo de la notificación'
    },
    tipo: {
      type: DataTypes.ENUM('evento', 'anuncio', 'recordatorio', 'campana', 'mensaje'),
      defaultValue: 'anuncio',
      comment: 'Tipo de notificación para determinar el ícono'
    },
    leida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el usuario ya leyó la notificación'
    },
    fecha_lectura: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora en que se marcó como leída'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Datos adicionales (URL, botón CTA, etc.)'
    }
  }, {
    tableName: 'notificaciones',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    indexes: [
      {
        fields: ['usuario_id']
      },
      {
        fields: ['leida']
      },
      {
        fields: ['fecha_creacion']
      }
    ]
  });

  Notificaciones.associate = function(models) {
    Notificaciones.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  };

  return Notificaciones;
};
