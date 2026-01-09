const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const RespuestaTestOrientacion = sequelize.define(
    'RespuestaTestOrientacion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      sesion_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Sesión de test a la que pertenece esta respuesta',
      },
      pregunta_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Pregunta respondida',
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Usuario que respondió (redundante pero útil para consultas)',
      },
      ronda: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Ronda del test (1 o 2)',
        validate: {
          isIn: [[1, 2]],
        },
      },
      respuesta: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment:
          'Respuesta del usuario (puede ser string, number, boolean, array según tipo de pregunta)',
      },
      tiempo_respuesta_segundos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tiempo que tardó el usuario en responder (en segundos)',
        validate: {
          min: 0,
        },
      },
      nivel_seguridad: {
        type: DataTypes.ENUM('muy_seguro', 'seguro', 'indeciso', 'muy_indeciso'),
        allowNull: true,
        comment: 'Nivel de seguridad del usuario al responder (opcional, del frontend)',
        validate: {
          isIn: [['muy_seguro', 'seguro', 'indeciso', 'muy_indeciso']],
        },
      },
      timestamp_respuesta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp exacto de cuando se registró la respuesta',
      },
    },
    {
      tableName: 'respuestas_test_orientacion',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  // Definir asociaciones
  RespuestaTestOrientacion.associate = (models) => {
    // Una respuesta pertenece a una sesión
    RespuestaTestOrientacion.belongsTo(models.SesionTestOrientacion, {
      foreignKey: 'sesion_id',
      as: 'sesion',
    });

    // Una respuesta pertenece a una pregunta
    RespuestaTestOrientacion.belongsTo(models.PreguntaOrientacion, {
      foreignKey: 'pregunta_id',
      as: 'pregunta',
    });

    // Una respuesta pertenece a un usuario
    RespuestaTestOrientacion.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });
  };

  // Métodos estáticos
  RespuestaTestOrientacion.obtenerPorSesion = async function (sesionId, ronda = null) {
    const where = { sesion_id: sesionId };
    if (ronda !== null) {
      where.ronda = ronda;
    }
    return await this.findAll({
      where,
      order: [['timestamp_respuesta', 'ASC']],
    });
  };

  RespuestaTestOrientacion.calcularTiempoPromedio = async function (sesionId) {
    const respuestas = await this.findAll({
      where: {
        sesion_id: sesionId,
        tiempo_respuesta_segundos: {
          [Op.not]: null,
        },
      },
      attributes: ['tiempo_respuesta_segundos'],
    });

    if (respuestas.length === 0) {
      return 0;
    }

    const total = respuestas.reduce((sum, r) => sum + (r.tiempo_respuesta_segundos || 0), 0);
    return Math.round(total / respuestas.length);
  };

  return RespuestaTestOrientacion;
};

