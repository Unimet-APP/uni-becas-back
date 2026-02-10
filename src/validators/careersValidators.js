const Joi = require('joi');

const createCareerSchema = Joi.object({
  code: Joi.string().max(30).allow('', null).optional(),
  name: Joi.string().max(150).required().messages({ 'any.required': 'El nombre de la carrera es requerido' }),
  faculty: Joi.string().max(120).required().messages({ 'any.required': 'La facultad es requerida' }),
  area: Joi.string().max(120).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  profile: Joi.string().allow('', null).optional(),
  job_field: Joi.string().allow('', null).optional(),
  duration: Joi.string().max(50).allow('', null).optional(),
  modality: Joi.string().max(50).allow('', null).optional(),
});

const updateCareerSchema = Joi.object({
  code: Joi.string().max(30).allow('', null).optional(),
  name: Joi.string().max(150).optional(),
  faculty: Joi.string().max(120).optional(),
  area: Joi.string().max(120).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  profile: Joi.string().allow('', null).optional(),
  job_field: Joi.string().allow('', null).optional(),
  duration: Joi.string().max(50).allow('', null).optional(),
  modality: Joi.string().max(50).allow('', null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        details: { validationErrors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })) },
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validateCreateCareer: validate(createCareerSchema),
  validateUpdateCareer: validate(updateCareerSchema),
};
