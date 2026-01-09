const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const TrayectoriaAcademica = sequelize.define(
    'TrayectoriaAcademica',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Usuario al que pertenece esta trayectoria',
      },
      carrera_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Carrera actual o carrera analizada (nullable si no está en sistema)',
      },
      trimestre: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 15,
        },
        comment: 'Trimestre actual del estudiante',
      },
      iaa: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 20,
        },
        comment: 'Índice Académico Acumulado',
      },
      asignaturas_aprobadas: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Número total de asignaturas aprobadas',
      },
      asignaturas_reprobadas: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Número total de asignaturas reprobadas',
      },
      asignaturas_por_area: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Asignaturas agrupadas por área (ej: {Matemáticas: 5, Humanidades: 3, Ciencias: 4})',
      },
      rendimiento_por_trimestre: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: "Historial de IAA por trimestre (ej: {'2024-1': 16.5, '2024-2': 17.2})",
      },
      actividades_extracurriculares: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment:
          "Array de actividades extracurriculares (ej: [{tipo: 'deportes', nombre: 'Fútbol'}, ...])",
      },
      proyectos_realizados: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment:
          "Array de proyectos realizados (ej: [{nombre: 'Proyecto X', area: 'Tecnología'}, ...])",
      },
      becas_activas: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de IDs de becas activas del estudiante',
      },
      fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de registro de esta trayectoria',
      },
      es_actual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment:
          'Indica si esta es la trayectoria actual del estudiante (solo una por usuario)',
      },
    },
    {
      tableName: 'trayectorias_academicas',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  // Definir asociaciones
  TrayectoriaAcademica.associate = (models) => {
    // Una trayectoria pertenece a un usuario
    TrayectoriaAcademica.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
    });

    // Una trayectoria puede tener una carrera
    TrayectoriaAcademica.belongsTo(models.Career, {
      foreignKey: 'carrera_id',
      as: 'carrera',
    });
  };

  // Métodos de instancia
  TrayectoriaAcademica.prototype.marcarComoActual = async function () {
    // Desmarcar otras trayectorias del mismo usuario
    await TrayectoriaAcademica.update(
      { es_actual: false },
      {
        where: {
          usuario_id: this.usuario_id,
          es_actual: true,
          id: {
            [Op.ne]: this.id,
          },
        },
      }
    );

    // Marcar esta como actual
    await this.update({ es_actual: true });
    return this;
  };

  TrayectoriaAcademica.prototype.obtenerRendimientoPorArea = function () {
    if (!this.asignaturas_por_area || typeof this.asignaturas_por_area !== 'object') {
      return {};
    }
    return this.asignaturas_por_area;
  };

  // Métodos estáticos
  TrayectoriaAcademica.obtenerActualPorUsuario = async function (usuarioId) {
    return await this.findOne({
      where: {
        usuario_id: usuarioId,
        es_actual: true,
      },
      include: [
        {
          model: sequelize.models.Career,
          as: 'carrera',
        },
      ],
    });
  };

  TrayectoriaAcademica.crearDesdeUsuario = async function (usuarioId) {
    const Usuario = sequelize.models.Usuario;
    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Desmarcar trayectoria actual anterior
    await this.update(
      { es_actual: false },
      {
        where: {
          usuario_id: usuarioId,
          es_actual: true,
        },
      }
    );

    // Crear nueva trayectoria desde datos del usuario
    const trayectoria = await this.create({
      usuario_id: usuarioId,
      trimestre: usuario.trimestre,
      iaa: usuario.iaa,
      asignaturas_aprobadas: usuario.asignaturasAprobadas,
      es_actual: true,
    });

    return trayectoria;
  };

  return TrayectoriaAcademica;
};

