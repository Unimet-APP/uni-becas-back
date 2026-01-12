const Joi = require('joi');

// Schema para iniciar test
const iniciarTestSchema = Joi.object({
  tipoTest: Joi.string().valid('Kuder', 'Holland_RIASEC').required().messages({
    'any.only': 'El tipo de test debe ser "Kuder" o "Holland_RIASEC"',
    'any.required': 'El tipo de test es requerido'
  })
});

// Schema para guardar respuestas Ronda 1
const guardarRespuestasRonda1Schema = Joi.object({
  sesionId: Joi.string().uuid().required().messages({
    'string.guid': 'El ID de sesión debe ser un UUID válido',
    'any.required': 'El ID de sesión es requerido'
  }),
  respuestas: Joi.array()
    .items(
      Joi.object({
        preguntaId: Joi.string().uuid().required(),
        respuesta: Joi.alternatives()
          .try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.any())
          )
          .required(),
        tiempoSegundos: Joi.number().integer().min(0).optional(),
        nivelSeguridad: Joi.string()
          .valid('muy_seguro', 'seguro', 'indeciso', 'muy_indeciso')
          .optional()
      })
    )
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'Debe haber al menos una respuesta',
      'array.max': 'No puede haber más de 20 respuestas',
      'any.required': 'El array de respuestas es requerido'
    })
});

// Schema para guardar respuestas Ronda 2
const guardarRespuestasRonda2Schema = Joi.object({
  sesionId: Joi.string().uuid().required().messages({
    'string.guid': 'El ID de sesión debe ser un UUID válido',
    'any.required': 'El ID de sesión es requerido'
  }),
  respuestas: Joi.array()
    .items(
      Joi.object({
        preguntaId: Joi.string().uuid().required(),
        respuesta: Joi.alternatives()
          .try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.any())
          )
          .required(),
        tiempoSegundos: Joi.number().integer().min(0).optional(),
        nivelSeguridad: Joi.string()
          .valid('muy_seguro', 'seguro', 'indeciso', 'muy_indeciso')
          .optional()
      })
    )
    .min(1)
    .max(15)
    .required()
    .messages({
      'array.min': 'Debe haber al menos una respuesta',
      'array.max': 'No puede haber más de 15 respuestas',
      'any.required': 'El array de respuestas es requerido'
    })
});

// Schema para analizar cambio de carrera
const analizarCambioCarreraSchema = Joi.object({
  nuevaCarreraId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID de carrera debe ser un número',
    'number.positive': 'El ID de carrera debe ser positivo',
    'any.required': 'El ID de la nueva carrera es requerido'
  })
});

// Schema para parámetros UUID
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'El ID debe ser un UUID válido',
    'any.required': 'El ID es requerido'
  })
});

// Schema para sesionId en params
const sesionIdParamSchema = Joi.object({
  sesionId: Joi.string().uuid().required().messages({
    'string.guid': 'El ID de sesión debe ser un UUID válido',
    'any.required': 'El ID de sesión es requerido'
  })
});

// Middleware validators
const validateIniciarTest = (req, res, next) => {
  const { error } = iniciarTestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  next();
};

const validateGuardarRespuestasRonda1 = (req, res, next) => {
  const { error } = guardarRespuestasRonda1Schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  next();
};

const validateGuardarRespuestasRonda2 = (req, res, next) => {
  const { error } = guardarRespuestasRonda2Schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  next();
};

const validateAnalizarCambioCarrera = (req, res, next) => {
  const { error } = analizarCambioCarreraSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  next();
};

const validateSesionIdParam = (req, res, next) => {
  const { error } = sesionIdParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación de parámetros',
      errors: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  next();
};

module.exports = {
  validateIniciarTest,
  validateGuardarRespuestasRonda1,
  validateGuardarRespuestasRonda2,
  validateAnalizarCambioCarrera,
  validateSesionIdParam
};

