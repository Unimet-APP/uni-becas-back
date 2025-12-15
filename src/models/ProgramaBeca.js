const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProgramaBeca = sequelize.define('ProgramaBeca', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100],
        isIn: [['Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente']]
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    porcentajeDescuento: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
        isDecimal: true
      },
      comment: 'Porcentaje de descuento otorgado (0-100)'
    },
    requisitos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      validate: {
        esObjetoValido(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Los requisitos deben ser un objeto JSON válido');
          }
        }
      },
      comment: 'Requisitos académicos y administrativos en formato JSON'
    },
    horasRequeridasRegular: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      },
      comment: 'Horas requeridas para trimestre regular (solo aplica para Ayudantía)'
    },
    horasRequeridasIntensivo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      },
      comment: 'Horas requeridas para trimestre intensivo (solo aplica para Ayudantía)'
    },
    limiteHorasSemanalesRegular: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      },
      comment: 'Máximo de horas semanales permitidas en trimestre regular'
    },
    limiteHorasSemanalesIntensivo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        isInt: true
      },
      comment: 'Máximo de horas semanales permitidas en trimestre intensivo'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'programas_becas',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeValidate: (programa) => {
        // Normalizar nombre
        if (programa.nombre) {
          programa.nombre = programa.nombre.trim();
        }
        // Normalizar descripción
        if (programa.descripcion) {
          programa.descripcion = programa.descripcion.trim();
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['nombre']
      },
      {
        fields: ['activo']
      }
    ]
  });

  // Definir asociaciones
  // NOTA: No se definen asociaciones físicas (FKs) porque tipoBeca en Postulacion y EstudianteBecario
  // es un campo ENUM, no una FK. La relación es lógica y se maneja mediante consultas manuales.
  ProgramaBeca.associate = (models) => {
    // Las relaciones se manejan manualmente mediante consultas por nombre
  };

  // Métodos de instancia
  ProgramaBeca.prototype.esAyudantia = function() {
    return this.nombre === 'Ayudantía';
  };

  ProgramaBeca.prototype.tieneHorasRequeridas = function() {
    return this.horasRequeridasRegular !== null || this.horasRequeridasIntensivo !== null;
  };

  ProgramaBeca.prototype.obtenerHorasRequeridas = function(esIntensivo = false) {
    if (esIntensivo) {
      return this.horasRequeridasIntensivo || 0;
    }
    return this.horasRequeridasRegular || 0;
  };

  // Métodos estáticos
  ProgramaBeca.obtenerPorNombre = async function(nombre) {
    return await this.findOne({
      where: { nombre, activo: true }
    });
  };

  ProgramaBeca.listarActivos = async function() {
    return await this.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']]
    });
  };

  ProgramaBeca.obtenerPorcentajeDescuento = async function(tipoBeca) {
    const programa = await this.findOne({
      where: { nombre: tipoBeca, activo: true },
      attributes: ['porcentajeDescuento']
    });
    return programa ? programa.porcentajeDescuento : 0;
  };

  return ProgramaBeca;
};
