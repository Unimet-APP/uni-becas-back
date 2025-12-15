const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfiguracionBeca = sequelize.define('ConfiguracionBeca', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    tipoBeca: {
      type: DataTypes.ENUM(
        'Ayudantía',
        'Impacto',
        'Excelencia',
        'Exoneración de Pago',
        'Formación Docente'
      ),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    subtipoExcelencia: {
      type: DataTypes.ENUM(
        'Académica',
        'Deportiva',
        'Artística',
        'Emprendimiento',
        'Cívico'
      ),
      allowNull: true,
      validate: {
        validarSubtipoExcelencia(value) {
          if (this.tipoBeca === 'Excelencia' && !value) {
            throw new Error('El subtipo de excelencia es requerido cuando el tipo de beca es Excelencia');
          }
          if (this.tipoBeca !== 'Excelencia' && value) {
            throw new Error('El subtipo de excelencia solo es válido para becas de tipo Excelencia');
          }
        }
      }
    },
    // Información Básica
    montoMensual: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    cuposDisponibles: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      }
    },
    duracionMeses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 12,
        isInt: true
      }
    },
    // Requisitos Académicos
    promedioMinimo: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 20,
        isDecimal: true
      }
    },
    semestreMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 20,
        isInt: true
      }
    },
    semestreMaximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 20,
        isInt: true,
        esMayorQueSemestreMinimo(value) {
          if (value && this.semestreMinimo && value < this.semestreMinimo) {
            throw new Error('El semestre máximo debe ser mayor o igual al semestre mínimo');
          }
        }
      }
    },
    edadMaxima: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 16,
        max: 65,
        isInt: true
      }
    },
    // Requisitos Especiales
    requisitosEspeciales: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000]
      }
    },
    // Documentos Requeridos
    documentosRequeridos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('documentosRequeridos debe ser un array');
          }

          // Verificar que todos los elementos sean strings
          const invalidos = value.filter(doc => typeof doc !== 'string');
          if (invalidos.length > 0) {
            throw new Error('Todos los documentos deben ser strings');
          }

          // Verificar que no haya duplicados
          const unicos = [...new Set(value)];
          if (unicos.length !== value.length) {
            throw new Error('No puede haber documentos duplicados en documentosRequeridos');
          }
        }
      }
    }
  }, {
    tableName: 'configuraciones_becas',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        // Índice único compuesto para tipoBeca + subtipoExcelencia
        unique: true,
        fields: ['tipoBeca', 'subtipoExcelencia'],
        name: 'configuraciones_becas_tipo_subtipo_unique'
      },
      {
        fields: ['tipoBeca']
      }
    ],
    hooks: {
      beforeValidate: (configuracion) => {
        // Normalizar strings
        if (configuracion.requisitosEspeciales) {
          configuracion.requisitosEspeciales = configuracion.requisitosEspeciales.trim();
        }

        // Sanitización del array de documentos requeridos
        if (configuracion.documentosRequeridos && Array.isArray(configuracion.documentosRequeridos)) {
          configuracion.documentosRequeridos = configuracion.documentosRequeridos.map(doc => {
            if (typeof doc === 'string') {
              // Sanitizar cada documento: remover caracteres peligrosos
              return doc
                .replace(/<[^>]*>/g, '') // Remover HTML tags
                .replace(/javascript:/gi, '') // Remover javascript: protocol
                .replace(/on\w+\s*=/gi, '') // Remover event handlers
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
                .trim()
                .substring(0, 200); // Limitar longitud
            }
            return doc;
          }).filter(doc => doc && doc.length > 0); // Remover strings vacíos
        }
      }
    }
  });

  // Métodos de instancia
  ConfiguracionBeca.prototype.esExcelencia = function() {
    return this.tipoBeca === 'Excelencia';
  };

  ConfiguracionBeca.prototype.tieneSubtipo = function() {
    return this.subtipoExcelencia !== null && this.subtipoExcelencia !== undefined;
  };

  ConfiguracionBeca.prototype.obtenerIdentificador = function() {
    if (this.esExcelencia() && this.tieneSubtipo()) {
      return `${this.tipoBeca} - ${this.subtipoExcelencia}`;
    }
    return this.tipoBeca;
  };

  ConfiguracionBeca.prototype.cumpleRequisitosAcademicos = function(estudiante) {
    const errores = [];

    if (this.promedioMinimo && estudiante.promedio < this.promedioMinimo) {
      errores.push(`Promedio insuficiente. Mínimo requerido: ${this.promedioMinimo}`);
    }

    if (this.semestreMinimo && estudiante.semestre < this.semestreMinimo) {
      errores.push(`Semestre insuficiente. Mínimo requerido: ${this.semestreMinimo}`);
    }

    if (this.semestreMaximo && estudiante.semestre > this.semestreMaximo) {
      errores.push(`Semestre excedido. Máximo permitido: ${this.semestreMaximo}`);
    }

    if (this.edadMaxima && estudiante.edad > this.edadMaxima) {
      errores.push(`Edad excedida. Máximo permitido: ${this.edadMaxima} años`);
    }

    return {
      cumple: errores.length === 0,
      errores
    };
  };

  // Métodos estáticos
  ConfiguracionBeca.obtenerPorTipo = async function(tipoBeca, subtipoExcelencia = null) {
    const where = { tipoBeca };

    if (tipoBeca === 'Excelencia') {
      if (!subtipoExcelencia) {
        throw new Error('El subtipo de excelencia es requerido para becas de tipo Excelencia');
      }
      where.subtipoExcelencia = subtipoExcelencia;
    } else {
      where.subtipoExcelencia = null;
    }

    return await this.findOne({ where });
  };

  ConfiguracionBeca.listarPorTipo = async function(tipoBeca) {
    const where = { tipoBeca };
    return await this.findAll({ where });
  };

  ConfiguracionBeca.listarTodas = async function() {
    return await this.findAll({
      order: [
        ['tipoBeca', 'ASC'],
        ['subtipoExcelencia', 'ASC']
      ]
    });
  };

  ConfiguracionBeca.upsertConfiguracion = async function(datos) {
    const { tipoBeca, subtipoExcelencia, ...restoDatos } = datos;

    // Validar consistencia tipoBeca/subtipoExcelencia
    if (tipoBeca === 'Excelencia' && !subtipoExcelencia) {
      throw new Error('El subtipo de excelencia es requerido para becas de tipo Excelencia');
    }
    if (tipoBeca !== 'Excelencia' && subtipoExcelencia) {
      throw new Error('El subtipo de excelencia solo es válido para becas de tipo Excelencia');
    }

    // Buscar configuración existente
    const where = {
      tipoBeca,
      subtipoExcelencia: tipoBeca === 'Excelencia' ? subtipoExcelencia : null
    };

    const [configuracion, created] = await this.findOrCreate({
      where,
      defaults: {
        tipoBeca,
        subtipoExcelencia: tipoBeca === 'Excelencia' ? subtipoExcelencia : null,
        ...restoDatos
      }
    });

    // Si ya existía, actualizar
    if (!created) {
      await configuracion.update(restoDatos);
    }

    return {
      configuracion: await configuracion.reload(),
      created
    };
  };

  return ConfiguracionBeca;
};
