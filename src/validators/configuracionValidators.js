const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Validador para crear un nuevo período académico
 */
const validateCrearPeriodo = (req, res, next) => {
  const schema = Joi.object({
    periodoAcademico: Joi.string()
      .pattern(/^[0-9]{4}-[1-3]$/)
      .required()
      .messages({
        'string.pattern.base': 'El período académico debe tener el formato YYYY-N (ej: 2025-1, 2025-2)',
        'any.required': 'El período académico es requerido'
      }),
    semanaActual: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .default(1)
      .messages({
        'number.base': 'La semana actual debe ser un número',
        'number.min': 'La semana actual debe ser mínimo 1',
        'number.max': 'La semana actual debe ser máximo 12'
      }),
    semanasHabilitadas: Joi.array()
      .items(Joi.number().integer().min(1).max(12))
      .unique()
      .default([])
      .messages({
        'array.base': 'Las semanas habilitadas deben ser un array',
        'array.unique': 'No puede haber semanas duplicadas',
        'number.min': 'Cada semana debe ser mínimo 1',
        'number.max': 'Cada semana debe ser máximo 12'
      }),
    fechaInicio: Joi.date()
      .iso()
      .allow(null, '')
      .messages({
        'date.base': 'La fecha de inicio debe ser una fecha válida',
        'date.format': 'La fecha de inicio debe estar en formato ISO (YYYY-MM-DD)'
      }),
    fechaFin: Joi.date()
      .iso()
      .min(Joi.ref('fechaInicio'))
      .allow(null, '')
      .messages({
        'date.base': 'La fecha de fin debe ser una fecha válida',
        'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio'
      }),
    descripcion: Joi.string()
      .max(1000)
      .allow(null, '')
      .messages({
        'string.max': 'La descripción no puede exceder 1000 caracteres'
      }),
    activo: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'El campo activo debe ser verdadero o falso'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map(d => d.message);
    throw ApiError.badRequest(`Errores de validación: ${errores.join(', ')}`);
  }

  next();
};

/**
 * Validador para actualizar un período académico
 */
const validateActualizarPeriodo = (req, res, next) => {
  const schema = Joi.object({
    semanaActual: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .messages({
        'number.base': 'La semana actual debe ser un número',
        'number.min': 'La semana actual debe ser mínimo 1',
        'number.max': 'La semana actual debe ser máximo 12'
      }),
    fechaInicio: Joi.date()
      .iso()
      .allow(null, '')
      .messages({
        'date.base': 'La fecha de inicio debe ser una fecha válida'
      }),
    fechaFin: Joi.date()
      .iso()
      .allow(null, '')
      .messages({
        'date.base': 'La fecha de fin debe ser una fecha válida'
      }),
    descripcion: Joi.string()
      .max(1000)
      .allow(null, '')
      .messages({
        'string.max': 'La descripción no puede exceder 1000 caracteres'
      })
  }).min(1); // Al menos un campo debe estar presente

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map(d => d.message);
    throw ApiError.badRequest(`Errores de validación: ${errores.join(', ')}`);
  }

  next();
};

/**
 * Validador para cambiar la semana actual
 */
const validateCambiarSemana = (req, res, next) => {
  const schema = Joi.object({
    semana: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.base': 'La semana debe ser un número',
        'number.min': 'La semana debe ser mínimo 1',
        'number.max': 'La semana debe ser máximo 12',
        'any.required': 'La semana es requerida'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map(d => d.message);
    throw ApiError.badRequest(`Errores de validación: ${errores.join(', ')}`);
  }

  next();
};

/**
 * Validador para habilitar/deshabilitar una semana
 */
const validateSemanaAction = (req, res, next) => {
  const schema = Joi.object({
    semana: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.base': 'La semana debe ser un número',
        'number.min': 'La semana debe ser mínimo 1',
        'number.max': 'La semana debe ser máximo 12',
        'any.required': 'La semana es requerida'
      }),
    periodoId: Joi.string()
      .uuid()
      .allow(null, '')
      .messages({
        'string.guid': 'El ID del período debe ser un UUID válido'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map(d => d.message);
    throw ApiError.badRequest(`Errores de validación: ${errores.join(', ')}`);
  }

  next();
};

/**
 * Validador para verificar si una semana está habilitada
 */
const validateVerificarSemana = (req, res, next) => {
  const schema = Joi.object({
    semana: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.base': 'La semana debe ser un número',
        'number.min': 'La semana debe ser mínimo 1',
        'number.max': 'La semana debe ser máximo 12',
        'any.required': 'La semana es requerida'
      }),
    periodoAcademico: Joi.string()
      .pattern(/^[0-9]{4}-[1-3]$/)
      .allow(null, '')
      .messages({
        'string.pattern.base': 'El período académico debe tener el formato YYYY-N (ej: 2025-1)'
      })
  });

  const { error } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    const errores = error.details.map(d => d.message);
    throw ApiError.badRequest(`Errores de validación: ${errores.join(', ')}`);
  }

  next();
};

/**
 * Validador para parámetros de UUID
 */
const validateUuidParam = (paramName = 'id') => (req, res, next) => {
  const schema = Joi.object({
    [paramName]: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': `El ${paramName} debe ser un UUID válido`,
        'any.required': `El ${paramName} es requerido`
      })
  });

  const { error } = schema.validate({ [paramName]: req.params[paramName] });

  if (error) {
    throw ApiError.badRequest(error.details[0].message);
  }

  next();
};

module.exports = {
  validateCrearPeriodo,
  validateActualizarPeriodo,
  validateCambiarSemana,
  validateSemanaAction,
  validateVerificarSemana,
  validateUuidParam
};
