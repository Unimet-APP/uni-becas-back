const Joi = require('joi');

// Schema para crear una cita
const crearCitaSchema = Joi.object({
  estudiante_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID del estudiante debe ser un UUID válido',
      'any.required': 'El ID del estudiante es requerido'
    }),
  fecha: Joi.date().iso().min('now').required()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.min': 'La fecha no puede ser en el pasado',
      'any.required': 'La fecha es requerida'
    }),
  hora: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM',
      'any.required': 'La hora es requerida'
    }),
  modalidad: Joi.string().valid('presencial', 'virtual', 'telefonica').default('presencial')
    .messages({
      'any.only': 'La modalidad debe ser presencial, virtual o telefónica'
    }),
  motivo: Joi.string().min(3).max(255).required()
    .messages({
      'string.min': 'El motivo debe tener al menos 3 caracteres',
      'string.max': 'El motivo no puede exceder 255 caracteres',
      'any.required': 'El motivo es requerido'
    }),
  notas: Joi.string().max(1000).optional().allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    })
});

// Schema para actualizar una cita
const actualizarCitaSchema = Joi.object({
  fecha: Joi.date().iso().min('now').optional()
    .messages({
      'date.base': 'La fecha debe ser una fecha válida',
      'date.min': 'La fecha no puede ser en el pasado'
    }),
  hora: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    .messages({
      'string.pattern.base': 'La hora debe estar en formato HH:MM'
    }),
  modalidad: Joi.string().valid('presencial', 'virtual', 'telefonica').optional()
    .messages({
      'any.only': 'La modalidad debe ser presencial, virtual o telefónica'
    }),
  motivo: Joi.string().min(3).max(255).optional()
    .messages({
      'string.min': 'El motivo debe tener al menos 3 caracteres',
      'string.max': 'El motivo no puede exceder 255 caracteres'
    }),
  notas: Joi.string().max(1000).optional().allow('')
    .messages({
      'string.max': 'Las notas no pueden exceder 1000 caracteres'
    }),
  estado: Joi.string().valid('pendiente', 'confirmada', 'completada', 'cancelada').optional()
    .messages({
      'any.only': 'El estado debe ser pendiente, confirmada, completada o cancelada'
    }),
  notas_seguimiento: Joi.string().max(1000).optional().allow('')
    .messages({
      'string.max': 'Las notas de seguimiento no pueden exceder 1000 caracteres'
    })
}).min(1)
  .messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
  });

// Schema para citaId en params
const citaIdParamSchema = Joi.object({
  citaId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la cita debe ser un UUID válido',
      'any.required': 'El ID de la cita es requerido'
    })
});

// Middleware de validación genérico
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors
      });
    }

    next();
  };
};

// Exportar validadores
module.exports = {
  validateCrearCita: validate(crearCitaSchema, 'body'),
  validateActualizarCita: validate(actualizarCitaSchema, 'body'),
  validateCitaIdParam: validate(citaIdParamSchema, 'params')
};
