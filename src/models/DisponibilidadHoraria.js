const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DisponibilidadHoraria = sequelize.define('DisponibilidadHoraria', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID del usuario (debe tener rol ayudante)'
    },
    disponibilidad: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        lunes: [],
        martes: [],
        miercoles: [],
        jueves: [],
        viernes: [],
        sabado: [],
        domingo: []
      },
      validate: {
        isValidDisponibilidad(value) {
          // Validar que sea un objeto
          if (typeof value !== 'object' || value === null) {
            throw new Error('La disponibilidad debe ser un objeto');
          }

          // Días válidos
          const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

          // Validar que solo contenga días válidos
          const dias = Object.keys(value);
          for (const dia of dias) {
            if (!diasValidos.includes(dia)) {
              throw new Error(`Día inválido: ${dia}. Días válidos: ${diasValidos.join(', ')}`);
            }
          }

          // Validar que todos los días válidos estén presentes
          for (const dia of diasValidos) {
            if (!value[dia]) {
              throw new Error(`Falta el día: ${dia}`);
            }

            // Validar que sea un array
            if (!Array.isArray(value[dia])) {
              throw new Error(`El valor para ${dia} debe ser un array`);
            }

            // Validar formato de horas
            for (const hora of value[dia]) {
              // Validar formato HH:MM
              if (!/^\d{2}:\d{2}$/.test(hora)) {
                throw new Error(`Formato de hora inválido en ${dia}: ${hora}. Formato esperado: HH:MM`);
              }

              // Extraer horas y minutos
              const [horas, minutos] = hora.split(':').map(Number);

              // Validar rango de horas (06:00 - 22:00)
              if (horas < 6 || horas > 22) {
                throw new Error(`Hora fuera de rango en ${dia}: ${hora}. Rango permitido: 06:00 - 22:00`);
              }

              // Validar que solo sean intervalos de 30 minutos
              if (minutos !== 0 && minutos !== 30) {
                throw new Error(`Minutos inválidos en ${dia}: ${hora}. Solo se permiten 00 o 30 minutos`);
              }

              // Validar que la última hora permitida sea 22:00 (no 22:30)
              if (horas === 22 && minutos === 30) {
                throw new Error(`Hora inválida en ${dia}: ${hora}. La última hora permitida es 22:00`);
              }
            }

            // Validar que no haya duplicados
            const horasUnicas = new Set(value[dia]);
            if (horasUnicas.size !== value[dia].length) {
              throw new Error(`Hay horas duplicadas en ${dia}`);
            }
          }
        }
      },
      comment: 'Disponibilidad horaria semanal en formato JSONB. Cada día contiene un array de horas en formato HH:MM (bloques de 30min desde 06:00 hasta 22:00)'
    }
  }, {
    tableName: 'disponibilidad_horaria',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeValidate: (disponibilidad) => {
        // Sanitización de campo JSONB disponibilidad (prevenir XSS, inyección)
        if (disponibilidad.disponibilidad && typeof disponibilidad.disponibilidad === 'object') {
          const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

          for (const dia of diasValidos) {
            if (disponibilidad.disponibilidad[dia] && Array.isArray(disponibilidad.disponibilidad[dia])) {
              // Sanitizar cada hora en el array
              disponibilidad.disponibilidad[dia] = disponibilidad.disponibilidad[dia].map(hora => {
                if (typeof hora === 'string') {
                  // Remover cualquier carácter que no sea dígito o ':'
                  // Solo permitir formato HH:MM estricto
                  return hora
                    .replace(/[^0-9:]/g, '') // Solo números y dos puntos
                    .replace(/:{2,}/g, ':') // Evitar múltiples dos puntos consecutivos
                    .trim()
                    .substring(0, 5); // Limitar a HH:MM (5 caracteres max)
                }
                return hora;
              });
            }
          }
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['usuarioId']
      }
    ]
  });

  // Definir asociaciones
  DisponibilidadHoraria.associate = (models) => {
    // Una disponibilidad pertenece a un usuario
    DisponibilidadHoraria.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario'
    });
  };

  // Métodos de instancia
  DisponibilidadHoraria.prototype.getTotalBloques = function() {
    let total = 0;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    for (const dia of dias) {
      if (this.disponibilidad[dia]) {
        total += this.disponibilidad[dia].length;
      }
    }

    return total;
  };

  DisponibilidadHoraria.prototype.getTotalHoras = function() {
    // Cada bloque = 30 minutos = 0.5 horas
    return this.getTotalBloques() * 0.5;
  };

  DisponibilidadHoraria.prototype.getDisponibilidadPorDia = function(dia) {
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    if (!diasValidos.includes(dia.toLowerCase())) {
      throw new Error(`Día inválido: ${dia}`);
    }

    return this.disponibilidad[dia.toLowerCase()] || [];
  };

  return DisponibilidadHoraria;
};
