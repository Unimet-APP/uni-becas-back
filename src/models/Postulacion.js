const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Postulacion = sequelize.define('Postulacion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    cedula: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        // Validación para cédula venezolana o extranjera: V-XXXXXXX, V-XXXXXXXX, E-XXXXXXX, E-XXXXXXXX
        is: /^[VE]-\d{7,8}$/
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [7, 20]
      }
    },
    fechaNacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notEmpty: true,
        isDate: true,
        esMayorDeEdad(value) {
          const hoy = new Date();
          const fechaNac = new Date(value);
          const edad = hoy.getFullYear() - fechaNac.getFullYear();

          if (edad < 16) {
            throw new Error('Debe ser mayor de 16 años para postular');
          }
          if (edad > 65) {
            throw new Error('No puede ser mayor de 65 años para postular');
          }
        }
      }
    },
    estadoCivil: {
      type: DataTypes.ENUM(
        'soltero',
        'casado',
        'divorciado',
        'viudo',
        'union-estable'
      ),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    tipoPostulante: {
      type: DataTypes.ENUM(
        'estudiante-pregrado',
        'estudiante-postgrado',
        'estudiante-nuevo'
      ),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    carrera: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    trimestre: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        trimestreValido(value) {
          // Solo validar longitud si se proporciona un valor
          if (value && value.trim().length > 0) {
            if (value.length < 5 || value.length > 10) {
              throw new Error('El trimestre debe tener entre 5 y 10 caracteres');
            }
          }
        }
      }
    },
    iaa: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 20,
        esIAAValido(value) {
          // Solo validar si se proporciona un valor
          if (value === null || value === undefined) {
            return;
          }
          const tipoPostulante = this.tipoPostulante;
          if (tipoPostulante === 'estudiante-pregrado' && value < 12) {
            throw new Error('IAA mínimo para pregrado es 12 puntos');
          }
          if (tipoPostulante === 'estudiante-postgrado' && value < 14) {
            throw new Error('IAA mínimo para postgrado es 14 puntos');
          }
        }
      }
    },
    promedioBachillerato: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 20
      }
    },
    asignaturasAprobadas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      }
    },
    creditosInscritos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        creditosValidosOption(value) {
          // Solo validar si se proporciona un valor
          if (value === null || value === undefined) {
            return;
          }
          if (value < 3) {
            throw new Error('Debe tener al menos 3 créditos inscritos');
          }
          if (value > 30) {
            throw new Error('No puede tener más de 30 créditos inscritos');
          }
        },
        isInt: true
      }
    },
    tipoBeca: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Ayudantía',
      validate: {
        notEmpty: true,
        isIn: [['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente']]
      }
    },
    estado: {
      type: DataTypes.ENUM(
        'Pendiente',
        'En Revisión',
        'Aprobada',
        'Rechazada'
      ),
      allowNull: false,
      defaultValue: 'Pendiente',
      validate: {
        notEmpty: true
      }
    },
    fechaPostulacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fechaEvaluacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    evaluadoPor: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    documentos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        documentosValidos(value) {
          // Solo validar formato si se proporcionan documentos
          if (value && Array.isArray(value) && value.length > 0) {
            value.forEach(doc => {
              if (!doc.tipo || !doc.nombre) {
                throw new Error('Cada documento debe tener tipo y nombre');
              }
            });
          }
          // Los documentos pueden estar vacíos al crear la postulación
          // Se pueden agregar posteriormente mediante actualizaciones
        }
      }
    },
    motiveRechazo: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'postulaciones',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeValidate: (postulacion) => {
        // Normalizar email y cédula
        if (postulacion.email) {
          postulacion.email = postulacion.email.toLowerCase().trim();
        }
        if (postulacion.cedula) {
          postulacion.cedula = postulacion.cedula.toUpperCase().trim();
        }
        if (postulacion.telefono) {
          postulacion.telefono = postulacion.telefono.trim();
        }
        // Convertir trimestre vacío a null
        if (postulacion.trimestre !== undefined && (!postulacion.trimestre || postulacion.trimestre.trim() === '')) {
          postulacion.trimestre = null;
        }

        // Sanitización de campo JSON documentos (prevenir XSS, inyección)
        if (postulacion.documentos && Array.isArray(postulacion.documentos)) {
          postulacion.documentos = postulacion.documentos.map(doc => {
            if (typeof doc !== 'object' || doc === null) {
              return doc;
            }

            const sanitizedDoc = {};

            // Sanitizar cada campo del documento
            for (const [key, value] of Object.entries(doc)) {
              if (typeof value === 'string') {
                // Remover caracteres peligrosos y HTML tags
                sanitizedDoc[key] = value
                  .replace(/<[^>]*>/g, '') // Remover HTML tags
                  .replace(/javascript:/gi, '') // Remover javascript: protocol
                  .replace(/on\w+\s*=/gi, '') // Remover event handlers (onclick, onerror, etc)
                  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
                  .replace(/[<>'"]/g, (char) => { // Escapar caracteres peligrosos
                    const entities = { '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
                    return entities[char] || char;
                  })
                  .trim()
                  .substring(0, 500); // Limitar longitud
              } else {
                sanitizedDoc[key] = value;
              }
            }

            return sanitizedDoc;
          });
        }
      },
      beforeUpdate: (postulacion) => {
        // Si cambia el estado a Aprobada o Rechazada, establecer fecha de evaluación
        if (postulacion.changed('estado') &&
            ['Aprobada', 'Rechazada'].includes(postulacion.estado)) {
          postulacion.fechaEvaluacion = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['usuarioId']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['tipoBeca']
      },
      {
        fields: ['fechaPostulacion']
      },
      {
        fields: ['cedula']
      },
      {
        fields: ['email']
      }
    ]
  });

  // Definir asociaciones
  Postulacion.associate = (models) => {
    // Una postulación pertenece a un usuario
    Postulacion.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario'
    });

    // Una postulación puede ser evaluada por un usuario (admin/supervisor)
    Postulacion.belongsTo(models.Usuario, {
      foreignKey: 'evaluadoPor',
      as: 'evaluador'
    });

    // Una postulación aprobada puede convertirse en estudiante becario
    Postulacion.hasOne(models.EstudianteBecario, {
      foreignKey: 'postulacionId',
      as: 'estudianteBecario'
    });

    // Una postulación puede tener múltiples documentos
    Postulacion.hasMany(models.Documento, {
      foreignKey: 'postulacionId',
      as: 'documentosRelacionados'
    });
  };

  // Métodos de instancia
  Postulacion.prototype.puedeSerAprobada = function() {
    return ['Pendiente', 'En Revisión'].includes(this.estado);
  };

  Postulacion.prototype.puedeSerRechazada = function() {
    return ['Pendiente', 'En Revisión'].includes(this.estado);
  };

  Postulacion.prototype.puedeSerEditada = function() {
    return this.estado === 'Pendiente';
  };

  Postulacion.prototype.cumpleRequisitosIAA = function() {
    // Si no se ha proporcionado IAA, no se puede verificar
    if (this.iaa === null || this.iaa === undefined) {
      return false;
    }
    if (this.tipoPostulante === 'estudiante-pregrado') {
      return this.iaa >= 12;
    }
    if (this.tipoPostulante === 'estudiante-postgrado') {
      return this.iaa >= 14;
    }
    return true;
  };

  Postulacion.prototype.cumpleRequisitosCreditos = function() {
    // Si no se han proporcionado créditos, no se puede verificar
    if (this.creditosInscritos === null || this.creditosInscritos === undefined) {
      return false;
    }
    return this.creditosInscritos >= 3;
  };

  Postulacion.prototype.tieneDocumentosCompletos = function() {
    if (!this.documentos || !Array.isArray(this.documentos)) {
      return false;
    }

    const documentosRequeridos = [
      'cedula',
      'historico_notas',
      'flujograma_carrera',
      'plan_carrera_avalado'
    ];

    const documentosSubidos = this.documentos.map(doc => doc.tipo);
    return documentosRequeridos.every(req => documentosSubidos.includes(req));
  };

  Postulacion.prototype.aprobar = function(evaluadorId, observaciones = null) {
    this.estado = 'Aprobada';
    this.evaluadoPor = evaluadorId;
    this.fechaEvaluacion = new Date();
    if (observaciones) {
      this.observaciones = observaciones;
    }
    return this.save();
  };

  Postulacion.prototype.rechazar = function(evaluadorId, motivo) {
    this.estado = 'Rechazada';
    this.evaluadoPor = evaluadorId;
    this.fechaEvaluacion = new Date();
    this.motiveRechazo = motivo;
    return this.save();
  };

  return Postulacion;
};