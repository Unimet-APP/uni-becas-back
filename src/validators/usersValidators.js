const Joi = require('joi');
const { VALIDACIONES, REGEX_VENEZOLANOS, ROLES } = require('../config/constants');

// Esquema para actualización de perfil de usuario
const updateUserSchema = Joi.object({
  nombre: Joi.string()
    .min(VALIDACIONES.NOMBRE_MIN_LENGTH)
    .max(VALIDACIONES.NOMBRE_MAX_LENGTH)
    .pattern(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/)
    .optional()
    .messages({
      'string.min': `El nombre debe tener al menos ${VALIDACIONES.NOMBRE_MIN_LENGTH} caracteres`,
      'string.max': `El nombre no puede tener más de ${VALIDACIONES.NOMBRE_MAX_LENGTH} caracteres`,
      'string.pattern.base': 'El nombre solo puede contener letras y espacios'
    }),
  apellido: Joi.string()
    .min(VALIDACIONES.NOMBRE_MIN_LENGTH)
    .max(VALIDACIONES.NOMBRE_MAX_LENGTH)
    .pattern(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/)
    .optional()
    .messages({
      'string.min': `El apellido debe tener al menos ${VALIDACIONES.NOMBRE_MIN_LENGTH} caracteres`,
      'string.max': `El apellido no puede tener más de ${VALIDACIONES.NOMBRE_MAX_LENGTH} caracteres`,
      'string.pattern.base': 'El apellido solo puede contener letras y espacios'
    }),
  telefono: Joi.string()
    .min(7)
    .max(20)
    .optional()
    .messages({
      'string.min': 'El teléfono debe tener al menos 7 caracteres',
      'string.max': 'El teléfono no puede tener más de 20 caracteres'
    }),
  carnet: Joi.string()
    .max(20)
    .optional(),
  departamento: Joi.string()
    .max(100)
    .optional(),
  cargo: Joi.string()
    .max(100)
    .optional(),
  carrera: Joi.string()
    .max(100)
    .optional(),
  trimestre: Joi.number()
    .integer()
    .min(1)
    .max(15)
    .optional()
    .messages({
      'number.min': 'El trimestre debe ser al menos 1',
      'number.max': 'El trimestre no puede ser mayor a 15'
    }),
  iaa: Joi.number()
    .min(0)
    .max(20)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'El IAA debe ser al menos 0',
      'number.max': 'El IAA no puede ser mayor a 20'
    }),
  asignaturasAprobadas: Joi.number()
    .integer()
    .min(0)
    .max(200)
    .optional()
    .messages({
      'number.min': 'Las asignaturas aprobadas deben ser al menos 0',
      'number.max': 'Las asignaturas aprobadas no pueden ser mayores a 200',
      'number.integer': 'Las asignaturas aprobadas deben ser un número entero'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Esquema para cambio de rol (solo admin)
const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required()
    .messages({
      'any.only': `El rol debe ser uno de: ${Object.values(ROLES).join(', ')}`,
      'any.required': 'El rol es requerido'
    })
});

// Esquema para filtros de búsqueda
const userFiltersSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .optional(),
  activo: Joi.boolean()
    .optional(),
  search: Joi.string()
    .max(100)
    .optional(),
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
    const dataToValidate = schema === userFiltersSchema ? req.query : req.body;

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
    if (schema === userFiltersSchema) {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  validateUpdateUser: validate(updateUserSchema),
  validateUpdateRole: validate(updateRoleSchema),
  validateUserFilters: validate(userFiltersSchema),

  // Exportar esquemas para uso directo si es necesario
  schemas: {
    updateUser: updateUserSchema,
    updateRole: updateRoleSchema,
    userFilters: userFiltersSchema
  }
};