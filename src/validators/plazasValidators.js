const Joi = require('joi');
const { validate } = require('../middleware/validation');

// Schema para horario (array de objetos con día y horas)
const horarioSchema = Joi.object({
  dia: Joi.string()
    .valid('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')
    .required()
    .messages({
      'any.only': 'Día debe ser uno de: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo',
      'any.required': 'Día es requerido'
    }),
  horaInicio: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'Hora de inicio debe tener formato HH:MM (ej: 08:00)',
      'any.required': 'Hora de inicio es requerida'
    }),
  horaFin: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'Hora de fin debe tener formato HH:MM (ej: 12:00)',
      'any.required': 'Hora de fin es requerida'
    })
});

// Schema para crear plaza
const createPlazaSchema = Joi.object({
  nombre: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Nombre debe tener al menos 3 caracteres',
      'string.max': 'Nombre no puede exceder 200 caracteres',
      'any.required': 'Nombre es requerido'
    }),
  ubicacion: Joi.string()
    .max(200)
    .allow(null, '')
    .messages({
      'string.max': 'Ubicación no puede exceder 200 caracteres'
    }),
  capacidad: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Capacidad debe ser al menos 1',
      'number.max': 'Capacidad no puede exceder 10',
      'any.required': 'Capacidad es requerida'
    }),
  ocupadas: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Plazas ocupadas no puede ser negativo'
    }),
  horario: Joi.array()
    .items(horarioSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'Debe proporcionar al menos un horario',
      'any.required': 'Horario es requerido'
    }),
  estado: Joi.string()
    .valid('Activa', 'Inactiva', 'Completa')
    .default('Activa')
    .messages({
      'any.only': 'Estado debe ser Activa, Inactiva o Completa'
    }),
  tipoAyudantia: Joi.string()
    .valid('academica', 'administrativa', 'investigacion')
    .default('academica')
    .messages({
      'any.only': 'Tipo de ayudantía debe ser academica, administrativa o investigacion'
    }),
  descripcionActividades: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Descripción de actividades no puede exceder 5000 caracteres'
    }),
  requisitosEspeciales: Joi.array()
    .items(Joi.string().min(1).max(500))
    .allow(null)
    .messages({
      'string.max': 'Cada requisito no puede exceder 500 caracteres'
    }),
  horasSemana: Joi.number()
    .integer()
    .valid(5, 10)
    .default(10)
    .messages({
      'any.only': 'Horas por semana debe ser 5 (intensiva) o 10 (regular)'
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
  fechaInicio: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': 'Fecha de inicio debe tener formato ISO (YYYY-MM-DD)'
    }),
  fechaFin: Joi.date()
    .iso()
    .greater(Joi.ref('fechaInicio'))
    .allow(null)
    .messages({
      'date.format': 'Fecha de fin debe tener formato ISO (YYYY-MM-DD)',
      'date.greater': 'Fecha de fin debe ser posterior a la fecha de inicio'
    }),
  supervisorResponsable: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Supervisor responsable debe ser un UUID válido'
    }),
  observaciones: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Observaciones no puede exceder 5000 caracteres'
    })
});

// Schema para actualizar plaza (todos los campos opcionales excepto validaciones)
const updatePlazaSchema = Joi.object({
  nombre: Joi.string()
    .min(3)
    .max(200)
    .messages({
      'string.min': 'Nombre debe tener al menos 3 caracteres',
      'string.max': 'Nombre no puede exceder 200 caracteres'
    }),
  ubicacion: Joi.string()
    .max(200)
    .allow(null, '')
    .messages({
      'string.max': 'Ubicación no puede exceder 200 caracteres'
    }),
  capacidad: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .messages({
      'number.min': 'Capacidad debe ser al menos 1',
      'number.max': 'Capacidad no puede exceder 10'
    }),
  ocupadas: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.min': 'Plazas ocupadas no puede ser negativo'
    }),
  horario: Joi.array()
    .items(horarioSchema)
    .min(1)
    .messages({
      'array.min': 'Debe proporcionar al menos un horario'
    }),
  estado: Joi.string()
    .valid('Activa', 'Inactiva', 'Completa')
    .messages({
      'any.only': 'Estado debe ser Activa, Inactiva o Completa'
    }),
  tipoAyudantia: Joi.string()
    .valid('academica', 'administrativa', 'investigacion')
    .messages({
      'any.only': 'Tipo de ayudantía debe ser academica, administrativa o investigacion'
    }),
  descripcionActividades: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Descripción de actividades no puede exceder 5000 caracteres'
    }),
  requisitosEspeciales: Joi.array()
    .items(Joi.string().min(1).max(500))
    .allow(null)
    .messages({
      'string.max': 'Cada requisito no puede exceder 500 caracteres'
    }),
  horasSemana: Joi.number()
    .integer()
    .valid(5, 10)
    .messages({
      'any.only': 'Horas por semana debe ser 5 (intensiva) o 10 (regular)'
    }),
  periodoAcademico: Joi.string()
    .min(5)
    .max(10)
    .messages({
      'string.min': 'Período académico debe tener al menos 5 caracteres',
      'string.max': 'Período académico no puede exceder 10 caracteres'
    }),
  fechaInicio: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': 'Fecha de inicio debe tener formato ISO (YYYY-MM-DD)'
    }),
  fechaFin: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': 'Fecha de fin debe tener formato ISO (YYYY-MM-DD)'
    }),
  supervisorResponsable: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Supervisor responsable debe ser un UUID válido'
    }),
  observaciones: Joi.string()
    .max(5000)
    .allow(null, '')
    .messages({
      'string.max': 'Observaciones no puede exceder 5000 caracteres'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Schema para filtros de listado
const plazaFiltersSchema = Joi.object({
  estado: Joi.string()
    .valid('Activa', 'Inactiva', 'Completa')
    .messages({
      'any.only': 'Estado debe ser Activa, Inactiva o Completa'
    }),
  tipoAyudantia: Joi.string()
    .valid('academica', 'administrativa', 'investigacion')
    .messages({
      'any.only': 'Tipo de ayudantía debe ser academica, administrativa o investigacion'
    }),
  periodoAcademico: Joi.string()
    .max(10)
    .messages({
      'string.max': 'Período académico no puede exceder 10 caracteres'
    }),
  disponibles: Joi.boolean()
    .messages({
      'boolean.base': 'Disponibles debe ser un valor booleano'
    }),
  search: Joi.string()
    .max(200)
    .messages({
      'string.max': 'Búsqueda no puede exceder 200 caracteres'
    }),
  ayudanteId: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'El ID del ayudante debe ser un UUID válido'
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
const validateCreatePlaza = validate(createPlazaSchema);
const validateUpdatePlaza = validate(updatePlazaSchema);
const validatePlazaFilters = validate(plazaFiltersSchema, 'query');

module.exports = {
  validateCreatePlaza,
  validateUpdatePlaza,
  validatePlazaFilters
};
