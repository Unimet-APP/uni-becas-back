const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Validador para query params al listar configuraciones de becas
 */
const validateListarConfiguraciones = (req, res, next) => {
  const schema = Joi.object({
    tipoBeca: Joi.string()
      .valid('Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente')
      .optional()
      .messages({
        'any.only': 'El tipo de beca debe ser uno de: Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente'
      }),
    subtipoExcelencia: Joi.string()
      .valid('Académica', 'Deportiva', 'Artística', 'Emprendimiento', 'Cívico')
      .optional()
      .messages({
        'any.only': 'El subtipo de excelencia debe ser uno de: Académica, Deportiva, Artística, Emprendimiento, Cívico'
      })
  }).custom((value, helpers) => {
    // Validar que si viene subtipoExcelencia, debe venir tipoBeca=Excelencia
    if (value.subtipoExcelencia && value.tipoBeca !== 'Excelencia') {
      return helpers.error('custom.subtipoSinExcelencia');
    }
    return value;
  }, 'Validación de subtipo de excelencia').messages({
    'custom.subtipoSinExcelencia': 'El subtipo de excelencia solo es válido cuando el tipo de beca es Excelencia'
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    const errores = error.details.map(detail => detail.message).join(', ');
    return next(ApiError.badRequest(`Error de validación: ${errores}`));
  }

  req.query = value;
  next();
};

/**
 * Validador para query params al obtener documentos requeridos
 */
const validateGetDocumentosRequeridos = (req, res, next) => {
  const schema = Joi.object({
    tipoBeca: Joi.string()
      .valid('Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente')
      .required()
      .messages({
        'any.only': 'El tipo de beca debe ser uno de: Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente',
        'any.required': 'El tipo de beca es requerido'
      }),
    subtipoExcelencia: Joi.string()
      .valid('Académica', 'Deportiva', 'Artística', 'Emprendimiento', 'Cívico')
      .when('tipoBeca', {
        is: 'Excelencia',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'any.only': 'El subtipo de excelencia debe ser uno de: Académica, Deportiva, Artística, Emprendimiento, Cívico',
        'any.required': 'El subtipo de excelencia es requerido para becas de tipo Excelencia',
        'any.unknown': 'El subtipo de excelencia solo es válido para becas de tipo Excelencia'
      })
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    const errores = error.details.map(detail => detail.message).join(', ');
    return next(ApiError.badRequest(`Error de validación: ${errores}`));
  }

  req.query = value;
  next();
};

/**
 * Validador para body al crear/actualizar configuración de beca (UPSERT)
 */
const validateUpsertConfiguracionBeca = (req, res, next) => {
  const schema = Joi.object({
    tipoBeca: Joi.string()
      .valid('Ayudantía', 'Impacto', 'Excelencia', 'Exoneración de Pago', 'Formación Docente')
      .required()
      .messages({
        'any.only': 'El tipo de beca debe ser uno de: Ayudantía, Impacto, Excelencia, Exoneración de Pago, Formación Docente',
        'any.required': 'El tipo de beca es requerido'
      }),
    subtipoExcelencia: Joi.string()
      .valid('Académica', 'Deportiva', 'Artística', 'Emprendimiento', 'Cívico')
      .when('tipoBeca', {
        is: 'Excelencia',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'any.only': 'El subtipo de excelencia debe ser uno de: Académica, Deportiva, Artística, Emprendimiento, Cívico',
        'any.required': 'El subtipo de excelencia es requerido para becas de tipo Excelencia',
        'any.unknown': 'El subtipo de excelencia solo es válido para becas de tipo Excelencia'
      }),
    // Información Básica
    montoMensual: Joi.number()
      .precision(2)
      .min(0)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'El monto mensual debe ser un número',
        'number.min': 'El monto mensual debe ser mayor o igual a 0',
        'number.precision': 'El monto mensual debe tener máximo 2 decimales'
      }),
    cuposDisponibles: Joi.number()
      .integer()
      .min(0)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'Los cupos disponibles deben ser un número',
        'number.integer': 'Los cupos disponibles deben ser un número entero',
        'number.min': 'Los cupos disponibles deben ser mayor o igual a 0'
      }),
    duracionMeses: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'La duración en meses debe ser un número',
        'number.integer': 'La duración en meses debe ser un número entero',
        'number.min': 'La duración en meses debe ser mínimo 1',
        'number.max': 'La duración en meses debe ser máximo 12'
      }),
    // Requisitos Académicos
    promedioMinimo: Joi.number()
      .precision(2)
      .min(0)
      .max(20)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'El promedio mínimo debe ser un número',
        'number.min': 'El promedio mínimo debe ser mayor o igual a 0',
        'number.max': 'El promedio mínimo debe ser menor o igual a 20',
        'number.precision': 'El promedio mínimo debe tener máximo 2 decimales'
      }),
    semestreMinimo: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'El semestre mínimo debe ser un número',
        'number.integer': 'El semestre mínimo debe ser un número entero',
        'number.min': 'El semestre mínimo debe ser mínimo 1',
        'number.max': 'El semestre mínimo debe ser máximo 20'
      }),
    semestreMaximo: Joi.number()
      .integer()
      .min(1)
      .max(20)
      .allow(null)
      .optional()
      .min(Joi.ref('semestreMinimo'))
      .messages({
        'number.base': 'El semestre máximo debe ser un número',
        'number.integer': 'El semestre máximo debe ser un número entero',
        'number.min': 'El semestre máximo debe ser mayor o igual al semestre mínimo',
        'number.max': 'El semestre máximo debe ser máximo 20'
      }),
    edadMaxima: Joi.number()
      .integer()
      .min(16)
      .max(65)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'La edad máxima debe ser un número',
        'number.integer': 'La edad máxima debe ser un número entero',
        'number.min': 'La edad máxima debe ser mínimo 16',
        'number.max': 'La edad máxima debe ser máximo 65'
      }),
    // Requisitos Especiales
    requisitosEspeciales: Joi.string()
      .max(5000)
      .allow(null, '')
      .optional()
      .messages({
        'string.base': 'Los requisitos especiales deben ser un texto',
        'string.max': 'Los requisitos especiales no pueden exceder 5000 caracteres'
      }),
    // Documentos Requeridos
    documentosRequeridos: Joi.array()
      .items(Joi.string().max(200))
      .unique()
      .default([])
      .optional()
      .messages({
        'array.base': 'Los documentos requeridos deben ser un array',
        'array.unique': 'No puede haber documentos duplicados',
        'string.base': 'Cada documento debe ser un texto',
        'string.max': 'Cada documento no puede exceder 200 caracteres'
      })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errores = error.details.map(detail => detail.message).join(', ');
    return next(ApiError.badRequest(`Error de validación: ${errores}`));
  }

  req.body = value;
  next();
};

module.exports = {
  validateListarConfiguraciones,
  validateGetDocumentosRequeridos,
  validateUpsertConfiguracionBeca
};
