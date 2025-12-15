const Joi = require('joi');

// Días válidos de la semana
const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// Validación personalizada para horas
const validarHora = (value, helpers) => {
  // Formato HH:MM
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return helpers.error('string.pattern.base');
  }

  const [horas, minutos] = value.split(':').map(Number);

  // Rango de horas: 06:00 - 22:00
  if (horas < 6 || horas > 22) {
    return helpers.message('La hora debe estar entre 06:00 y 22:00');
  }

  // Solo intervalos de 30 minutos
  if (minutos !== 0 && minutos !== 30) {
    return helpers.message('Los minutos deben ser 00 o 30');
  }

  // La última hora permitida es 22:00, no 22:30
  if (horas === 22 && minutos === 30) {
    return helpers.message('La última hora permitida es 22:00');
  }

  return value;
};

// Esquema para un día individual
const diaSchema = Joi.array()
  .items(
    Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .custom(validarHora)
  )
  .unique()
  .messages({
    'array.unique': 'No se permiten horas duplicadas en el mismo día',
    'string.pattern.base': 'Formato de hora inválido. Use HH:MM (ej: 07:30)'
  });

// Esquema para la disponibilidad completa
const disponibilidadSchema = Joi.object({
  lunes: diaSchema.required(),
  martes: diaSchema.required(),
  miercoles: diaSchema.required(),
  jueves: diaSchema.required(),
  viernes: diaSchema.required(),
  sabado: diaSchema.required(),
  domingo: diaSchema.required()
}).messages({
  'any.required': 'Todos los días de la semana son requeridos',
  'object.unknown': 'Solo se permiten los días: lunes, martes, miércoles, jueves, viernes, sábado, domingo'
});

// Esquema para crear o actualizar disponibilidad
const createOrUpdateDisponibilidadSchema = Joi.object({
  disponibilidad: disponibilidadSchema.required().messages({
    'any.required': 'El campo disponibilidad es requerido'
  })
});

// Esquema para buscar ayudantes disponibles
const buscarAyudantesSchema = Joi.object({
  dia: Joi.string()
    .valid(...DIAS_SEMANA)
    .required()
    .messages({
      'any.only': `El día debe ser uno de: ${DIAS_SEMANA.join(', ')}`,
      'any.required': 'El campo dia es requerido'
    }),
  hora: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .custom(validarHora)
    .required()
    .messages({
      'any.required': 'El campo hora es requerido',
      'string.pattern.base': 'Formato de hora inválido. Use HH:MM (ej: 07:30)'
    })
});

// Esquema para verificar disponibilidad
const verificarDisponibilidadSchema = Joi.object({
  usuarioId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El usuarioId debe ser un UUID válido',
      'any.required': 'El campo usuarioId es requerido'
    }),
  dia: Joi.string()
    .valid(...DIAS_SEMANA)
    .required()
    .messages({
      'any.only': `El día debe ser uno de: ${DIAS_SEMANA.join(', ')}`,
      'any.required': 'El campo dia es requerido'
    }),
  hora: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .custom(validarHora)
    .required()
    .messages({
      'any.required': 'El campo hora es requerido',
      'string.pattern.base': 'Formato de hora inválido. Use HH:MM (ej: 07:30)'
    })
});

// Esquema para filtros de listado
const disponibilidadFiltersSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20),
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
});

// Middleware de validación genérico
const validate = (schema) => {
  return (req, res, next) => {
    const dataToValidate =
      schema === disponibilidadFiltersSchema ? req.query : req.body;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        timestamp: new Date().toISOString(),
        details: { validationErrors }
      });
    }

    // Reemplazar datos originales con datos validados
    if (schema === disponibilidadFiltersSchema) {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  validateCreateOrUpdateDisponibilidad: validate(createOrUpdateDisponibilidadSchema),
  validateBuscarAyudantes: validate(buscarAyudantesSchema),
  validateVerificarDisponibilidad: validate(verificarDisponibilidadSchema),
  validateDisponibilidadFilters: validate(disponibilidadFiltersSchema),

  // Exportar esquemas para uso directo si es necesario
  schemas: {
    createOrUpdateDisponibilidad: createOrUpdateDisponibilidadSchema,
    buscarAyudantes: buscarAyudantesSchema,
    verificarDisponibilidad: verificarDisponibilidadSchema,
    disponibilidadFilters: disponibilidadFiltersSchema,
    disponibilidad: disponibilidadSchema
  }
};
