const Joi = require('joi');
const { validate } = require('../middleware/validation');

// Schema para crear reporte
const createReporteSchema = Joi.object({
  semana: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.min': 'La semana debe ser entre 1 y 12',
      'number.max': 'La semana debe ser entre 1 y 12',
      'any.required': 'La semana es requerida'
    }),
  periodoAcademico: Joi.string()
    .min(5)
    .max(10)
    .required()
    .messages({
      'string.min': 'Período académico debe tener al menos 5 caracteres',
      'string.max': 'Período académico no puede exceder 10 caracteres',
      'any.required': 'Período académico es requerido'
    }),
  fecha: Joi.date()
    .iso()
    .max('now')
    .allow(null)
    .messages({
      'date.format': 'Fecha debe tener formato ISO (YYYY-MM-DD)',
      'date.max': 'La fecha no puede ser futura'
    }),
  horasTrabajadas: Joi.number()
    .min(0.5)
    .max(50)
    .required()
    .messages({
      'number.min': 'Horas trabajadas debe ser al menos 0.5 (30 minutos)',
      'number.max': 'Horas trabajadas no puede exceder 50 horas por semana',
      'any.required': 'Horas trabajadas es requerido'
    }),
  objetivosPeriodo: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Objetivos del período no puede exceder 5000 caracteres'
    }),
  metasEspecificas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Metas específicas no puede exceder 5000 caracteres'
    }),
  actividadesProgramadas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Actividades programadas no puede exceder 5000 caracteres'
    }),
  actividadesRealizadas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Actividades realizadas no puede exceder 5000 caracteres'
    }),
  descripcionActividades: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Descripción de actividades no puede exceder 5000 caracteres'
    }),
  observaciones: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Observaciones no puede exceder 5000 caracteres'
    })
});

// Schema para actualizar reporte (todos los campos opcionales)
const updateReporteSchema = Joi.object({
  horasTrabajadas: Joi.number()
    .min(0.5)
    .max(50)
    .messages({
      'number.min': 'Horas trabajadas debe ser al menos 0.5 (30 minutos)',
      'number.max': 'Horas trabajadas no puede exceder 50 horas por semana'
    }),
  objetivosPeriodo: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Objetivos del período no puede exceder 5000 caracteres'
    }),
  metasEspecificas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Metas específicas no puede exceder 5000 caracteres'
    }),
  actividadesProgramadas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Actividades programadas no puede exceder 5000 caracteres'
    }),
  actividadesRealizadas: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Actividades realizadas no puede exceder 5000 caracteres'
    }),
  descripcionActividades: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Descripción de actividades no puede exceder 5000 caracteres'
    }),
  observaciones: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Observaciones no puede exceder 5000 caracteres'
    }),
  fecha: Joi.date()
    .iso()
    .max('now')
    .allow(null)
    .messages({
      'date.format': 'Fecha debe tener formato ISO (YYYY-MM-DD)',
      'date.max': 'La fecha no puede ser futura'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Schema para aprobar reporte
const aprobarReporteSchema = Joi.object({
  observaciones: Joi.string()
    .max(2000)
    .allow(null, '')
    .messages({
      'string.max': 'Observaciones no puede exceder 2000 caracteres'
    })
});

// Schema para rechazar reporte
const rechazarReporteSchema = Joi.object({
  motivo: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'El motivo debe tener al menos 10 caracteres',
      'string.max': 'El motivo no puede exceder 2000 caracteres',
      'any.required': 'El motivo de rechazo es requerido'
    })
});

// Schema para filtros de listado
const reporteFiltersSchema = Joi.object({
  periodoAcademico: Joi.string()
    .max(10)
    .messages({
      'string.max': 'Período académico no puede exceder 10 caracteres'
    }),
  estado: Joi.string()
    .valid('Pendiente', 'Aprobada', 'Rechazada', 'En Revisión')
    .messages({
      'any.only': 'Estado debe ser Pendiente, Aprobada, Rechazada o En Revisión'
    }),
  semana: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .messages({
      'number.min': 'La semana debe ser entre 1 y 12',
      'number.max': 'La semana debe ser entre 1 y 12'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Límite debe ser al menos 1',
      'number.max': 'Límite no puede exceder 100'
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Offset no puede ser negativo'
    })
});

// Middleware de validación
const validateCreateReporte = validate(createReporteSchema);
const validateUpdateReporte = validate(updateReporteSchema);
const validateAprobarReporte = validate(aprobarReporteSchema);
const validateRechazarReporte = validate(rechazarReporteSchema);
const validateReporteFilters = validate(reporteFiltersSchema, 'query');

module.exports = {
  validateCreateReporte,
  validateUpdateReporte,
  validateAprobarReporte,
  validateRechazarReporte,
  validateReporteFilters
};
