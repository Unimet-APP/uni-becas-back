const Joi = require('joi');

const consultaSchema = Joi.object({
  prompt: Joi.string().required().min(10).max(5000),
  context: Joi.object({
    perfilEstudiante: Joi.object().optional(),
    carrerasDisponibles: Joi.array().optional()
  }).optional()
});

const recomendacionesSchema = Joi.object({
  perfilEstudiante: Joi.object({
    intereses: Joi.array().items(Joi.string()).optional(),
    habilidades: Joi.array().items(Joi.string()).optional(),
    resultadosTest: Joi.object().optional(),
    preferencias: Joi.object().optional()
  }).required(),
  carrerasDisponibles: Joi.array().items(
    Joi.object({
      nombre: Joi.string().required(),
      descripcion: Joi.string().optional()
    })
  ).required()
});

const chatSchema = Joi.object({
  mensajes: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').optional(),
      content: Joi.string().required()
    })
  ).min(1).required(),
  contexto: Joi.object().optional()
});

module.exports = {
  validateConsulta: (req, res, next) => {
    const { error } = consultaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(d => d.message)
      });
    }
    next();
  },
  validateRecomendaciones: (req, res, next) => {
    const { error } = recomendacionesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(d => d.message)
      });
    }
    next();
  },
  validateChat: (req, res, next) => {
    const { error } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(d => d.message)
      });
    }
    next();
  }
};