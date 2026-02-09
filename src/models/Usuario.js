const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      // NOTA: No usamos unique: true aquí porque usamos partial unique index en BD
      // El partial unique index permite re-registros después de soft delete
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 255]
      }
    },
    role: {
      type: DataTypes.ENUM(
        'estudiante',
        'supervisor',
        'admin', 
        'aspirante',
        'especialista'
      ),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [7, 20]
      }
    },
    carnet: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [0, 20]
      },
      comment: 'Carnet universitario o identificación institucional'
    },
    cedula: {
      type: DataTypes.STRING(20),
      allowNull: false,
      // NOTA: No usamos unique: true aquí porque usamos partial unique index en BD
      // El partial unique index permite re-registros después de soft delete
      validate: {
        notEmpty: true,
        // Validación para cédula venezolana o extranjera: V-XXXXXXX, V-XXXXXXXX, E-XXXXXXX, E-XXXXXXXX
        is: /^[VE]-\d{7,8}$/
      }
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    carrera: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [0, 100]
      }
    },
    trimestre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 15
      }
    },
    iaa: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 20
      },
      comment: 'Índice Académico Acumulado (solo estudiantes)'
    },
    asignaturasAprobadas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 200
      },
      comment: 'Número de asignaturas aprobadas (solo estudiantes)'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    firstLogin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el usuario debe cambiar su contraseña en el primer login (usuario creado automáticamente)'
    },
    fueAspirante: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el usuario fue aspirante y se convirtió en estudiante'
    },
    verificationCode: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Documentos PDF de la postulación (IDs de la tabla documentos)
    fotocopiaCedulaId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del documento: Fotocopia de Cédula de Identidad'
    },
    flujogramaCarreraId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del documento: Flujograma de carrera'
    },
    historicoNotasId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del documento: Histórico de notas'
    },
    planCarreraAvaladoId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del documento: Plan de carrera avalado'
    },
    curriculumDeportivoId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del documento: Curriculum deportivo'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de eliminación lógica del usuario'
    }
  }, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    defaultScope: {
      where: {
        deletedAt: null
      },
      attributes: { exclude: ['password'] }
    },
    scopes: {
      includingDeleted: {
        where: {},
        attributes: { exclude: ['password'] }
      },
      withPassword: {
        where: { deletedAt: null },
        attributes: {}
      },
      all: {
        where: {},
        attributes: {}
      }
    },
    hooks: {
      beforeValidate: (usuario) => {
        // Normalizar email a minúsculas
        if (usuario.email) {
          usuario.email = usuario.email.toLowerCase().trim();
        }

        // Normalizar cédula
        if (usuario.cedula) {
          usuario.cedula = usuario.cedula.toUpperCase().trim();
        }

        // Normalizar teléfono
        if (usuario.telefono) {
          usuario.telefono = usuario.telefono.trim();
        }
      }
    },
    indexes: [
      // NOTA: Los índices UNIQUE para email y cedula se crean manualmente en BD
      // como partial unique indexes (WHERE deletedAt IS NULL) para permitir
      // re-registros después de soft delete. Ver migración correspondiente.
      {
        fields: ['role']
      },
      {
        fields: ['activo']
      },
      {
        fields: ['deletedAt']
      }
    ]
  });

  // Definir asociaciones
  Usuario.associate = (models) => {
    // Un usuario puede tener múltiples postulaciones
    Usuario.hasMany(models.Postulacion, {
      foreignKey: 'usuarioId',
      as: 'postulaciones'
    });

    // Un usuario puede ser estudiante becario
    Usuario.hasOne(models.EstudianteBecario, {
      foreignKey: 'usuarioId',
      as: 'estudianteBecario'
    });

    // Un usuario supervisor tiene plazas asignadas
    Usuario.hasMany(models.Plaza, {
      foreignKey: 'supervisorResponsable',
      as: 'plazasAsignadas'
    });

    // Un usuario puede tener múltiples reportes de actividad
    Usuario.hasMany(models.ReporteActividad, {
      foreignKey: 'estudianteId',
      as: 'reportesActividad'
    });

    // Un supervisor puede aprobar múltiples reportes
    Usuario.hasMany(models.ReporteActividad, {
      foreignKey: 'supervisorId',
      as: 'reportesAprobados'
    });

    // Relaciones con documentos PDF
    Usuario.belongsTo(models.Documento, {
      foreignKey: 'fotocopiaCedulaId',
      as: 'fotocopiaCedula'
    });

    Usuario.belongsTo(models.Documento, {
      foreignKey: 'flujogramaCarreraId',
      as: 'flujogramaCarrera'
    });

    Usuario.belongsTo(models.Documento, {
      foreignKey: 'historicoNotasId',
      as: 'historicoNotas'
    });

    Usuario.belongsTo(models.Documento, {
      foreignKey: 'planCarreraAvaladoId',
      as: 'planCarreraAvalado'
    });

    Usuario.belongsTo(models.Documento, {
      foreignKey: 'curriculumDeportivoId',
      as: 'curriculumDeportivo'
    });

    // Un usuario (ayudante) puede tener disponibilidad horaria
    Usuario.hasOne(models.DisponibilidadHoraria, {
      foreignKey: 'usuarioId',
      as: 'disponibilidadHoraria'
    });
  };

  // Métodos de instancia
  Usuario.prototype.esEstudiante = function() {
    return this.role === 'estudiante';
  };

  Usuario.prototype.esSupervisor = function() {
    return this.role === 'supervisor';
  };

  Usuario.prototype.esAdmin = function() {
    return this.role === 'admin';
  };

  Usuario.prototype.puedePostular = function() {
    return this.role === 'estudiante' && this.activo && this.emailVerified;
  };

  Usuario.prototype.puedeEvaluar = function() {
    return this.esSupervisor() && this.activo;
  };

  Usuario.prototype.puedeAdministrar = function() {
    return this.esAdmin() && this.activo;
  };

  /** nuevos items */

  Usuario.prototype.esAspirante = function() {
    return this.role === 'aspirante';
  };

  Usuario.prototype.esEspecialista = function() {
    return this.role === 'especialista';
  };

  Usuario.prototype.puedeAccederOrientacionVocacional = function() {
    return ['estudiante','aspirante', 'especialista'].includes(this.role);
  };

  /**
   * Obtener todos los estudiantes supervisados a través de las plazas asignadas
   * @param {Object} options - Opciones de consulta (where, include, etc.)
   * @returns {Promise<Array>} - Array de EstudianteBecario
   */
  Usuario.prototype.getEstudiantesSupervisionados = async function(options = {}) {
    if (!this.esSupervisor()) {
      return [];
    }

    const { Plaza, EstudianteBecario } = require('./index');

    // Obtener las plazas del supervisor
    const plazas = await Plaza.findAll({
      where: {
        supervisorResponsable: this.id,
        estado: 'Activa'
      },
      attributes: ['id']
    });

    if (!plazas || plazas.length === 0) {
      return [];
    }

    const plazaIds = plazas.map(p => p.id);

    // Obtener los estudiantes becarios asignados a esas plazas
    const whereCondition = {
      plazaAsignada: plazaIds,
      estado: 'Activa',
      ...options.where
    };

    return await EstudianteBecario.findAll({
      where: whereCondition,
      include: options.include || [
        {
          model: require('./index').Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'cedula']
        },
        {
          model: Plaza,
          as: 'plaza',
          attributes: ['id', 'nombre', 'ubicacion', 'capacidad', 'ocupadas', 'estado']
        }
      ],
      ...options
    });
  };

  return Usuario;
};
