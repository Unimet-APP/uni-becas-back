const Joi = require('joi');

// Schema para iniciar test
const iniciarTestSchema = Joi.object({
  tipoTest: Joi.string().valid('Holland_RIASEC', 'Kuder').required()
    .messages({
      'any.only': 'El tipo de test debe ser Holland_RIASEC o Kuder',
      'any.required': 'El tipo de test es requerido'
    })
});

// Schema para guardar respuestas ronda 1
const respuestaSchema = Joi.object({
  preguntaId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la pregunta debe ser un UUID válido',
      'any.required': 'El ID de la pregunta es requerido'
    }),
  respuesta: Joi.boolean().required()
    .messages({
      'any.required': 'La respuesta es requerida'
    }),
  respuestaCorrecta: Joi.boolean().optional(),
  dimensionPredicha: Joi.string().optional(),
  tiempoRespuesta: Joi.number().integer().min(0).optional(),
  nivelSeguridad: Joi.string().valid('seguro', 'no_seguro').optional()
});

const guardarRespuestasRonda1Schema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    }),
  respuestas: Joi.array().items(respuestaSchema).min(1).required()
    .messages({
      'array.min': 'Debe enviar al menos una respuesta',
      'any.required': 'Las respuestas son requeridas'
    })
});

// Schema para guardar respuestas ronda 2
const guardarRespuestasRonda2Schema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    }),
  respuestas: Joi.array().items(respuestaSchema).min(1).required()
    .messages({
      'array.min': 'Debe enviar al menos una respuesta',
      'any.required': 'Las respuestas son requeridas'
    })
});

// Schema para sesionId en params
const sesionIdParamSchema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    })
});

// Schema para analizar cambio de carrera
const analizarCambioCarreraSchema = Joi.object({
  nuevaCarreraId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El ID de la carrera debe ser un número',
      'number.positive': 'El ID de la carrera debe ser positivo',
      'any.required': 'El ID de la nueva carrera es requerido'
    })
});

// Middleware de validación
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(source === 'body' ? req.body : req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(d => d.message)
      });
    }
    next();
  };
};

module.exports = {
  validateIniciarTest: validate(iniciarTestSchema),
  validateGuardarRespuestasRonda1: validate(guardarRespuestasRonda1Schema),
  validateGuardarRespuestasRonda2: validate(guardarRespuestasRonda2Schema),
  validateSesionIdParam: validate(sesionIdParamSchema, 'params'),
  validateAnalizarCambioCarrera: validate(analizarCambioCarreraSchema),
};
