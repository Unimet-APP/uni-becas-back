const Joi = require('joi');
const { VALIDACIONES, REGEX_VENEZOLANOS, ROLES } = require('../config/constants');

// Esquemas de validación personalizados
const cedulaSchema = Joi.string()
  .pattern(REGEX_VENEZOLANOS.CEDULA)
  .required()
  .messages({
    'string.pattern.base': 'La cédula debe tener el formato V-12345678 o E-12345678',
    'any.required': 'La cédula es requerida'
  });

const telefonoSchema = Joi.string()
  .min(7)
  .max(20)
  .optional()
  .messages({
    'string.min': 'El teléfono debe tener al menos 7 caracteres',
    'string.max': 'El teléfono no puede tener más de 20 caracteres'
  });

const emailSchema = Joi.string()
  .email()
  .max(VALIDACIONES.EMAIL_MAX_LENGTH)
  .required()
  .messages({
    'string.email': 'Debe ser un email válido',
    'string.max': `El email no puede tener más de ${VALIDACIONES.EMAIL_MAX_LENGTH} caracteres`,
    'any.required': 'El email es requerido'
  });

const passwordSchema = Joi.string()
  .min(VALIDACIONES.PASSWORD_MIN_LENGTH)
  .max(VALIDACIONES.PASSWORD_MAX_LENGTH)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
  .required()
  .messages({
    'string.min': `La contraseña debe tener al menos ${VALIDACIONES.PASSWORD_MIN_LENGTH} caracteres`,
    'string.max': `La contraseña no puede tener más de ${VALIDACIONES.PASSWORD_MAX_LENGTH} caracteres`,
    'string.pattern.base': 'La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial (@$!%*?&)',
    'any.required': 'La contraseña es requerida'
  });

const nombreSchema = Joi.string()
  .min(VALIDACIONES.NOMBRE_MIN_LENGTH)
  .max(VALIDACIONES.NOMBRE_MAX_LENGTH)
  .pattern(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/)
  .required()
  .messages({
    'string.min': `El nombre debe tener al menos ${VALIDACIONES.NOMBRE_MIN_LENGTH} caracteres`,
    'string.max': `El nombre no puede tener más de ${VALIDACIONES.NOMBRE_MAX_LENGTH} caracteres`,
    'string.pattern.base': 'El nombre solo puede contener letras y espacios',
    'any.required': 'El nombre es requerido'
  });

const apellidoSchema = Joi.string()
  .min(VALIDACIONES.NOMBRE_MIN_LENGTH)
  .max(VALIDACIONES.NOMBRE_MAX_LENGTH)
  .pattern(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/)
  .required()
  .messages({
    'string.min': `El apellido debe tener al menos ${VALIDACIONES.NOMBRE_MIN_LENGTH} caracteres`,
    'string.max': `El apellido no puede tener más de ${VALIDACIONES.NOMBRE_MAX_LENGTH} caracteres`,
    'string.pattern.base': 'El apellido solo puede contener letras y espacios',
    'any.required': 'El apellido es requerido'
  });

// Validaciones para login
const validateLogin = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es requerida'
  })
});

// Validaciones para registro
const validateRegister = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  nombre: nombreSchema,
  apellido: apellidoSchema,
  cedula: cedulaSchema,
  telefono: telefonoSchema,
  carnet: Joi.string()
    .max(20)
    .optional()
    .messages({
      'string.max': 'El carnet no puede tener más de 20 caracteres'
    }),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .optional()
    .default(ROLES.ESTUDIANTE)
    .messages({
      'any.only': `El rol debe ser uno de: ${Object.values(ROLES).join(', ')}`
    }),
  // Campos opcionales para supervisores/staff
  departamento: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'El departamento no puede tener más de 100 caracteres'
    }),
  cargo: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'El cargo no puede tener más de 100 caracteres'
    }),
  // Campos opcionales para estudiantes
  carrera: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'La carrera no puede tener más de 100 caracteres'
    }),
  trimestre: Joi.number()
    .integer()
    .min(1)
    .max(15)
    .optional()
    .messages({
      'number.base': 'El trimestre debe ser un número',
      'number.integer': 'El trimestre debe ser un número entero',
      'number.min': 'El trimestre debe ser al menos 1',
      'number.max': 'El trimestre no puede ser mayor a 15'
    })
});

// Validaciones para refresh token
const validateRefreshToken = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'El refresh token es requerido'
  })
});

// Validaciones para forgot password
const validateForgotPassword = Joi.object({
  email: emailSchema
});

// Validaciones para reset password
const validateResetPassword = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token de reseteo es requerido'
  }),
  nuevaPassword: passwordSchema
});

// Validaciones para cambio de contraseña
const validateChangePassword = Joi.object({
  passwordActual: Joi.string().required().messages({
    'any.required': 'La contraseña actual es requerida'
  }),
  nuevaPassword: passwordSchema
});

// Validaciones para actualización de perfil
const validateUpdateProfile = Joi.object({
  nombre: nombreSchema.optional(),
  apellido: apellidoSchema.optional(),
  telefono: telefonoSchema
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Middleware de validación genérico
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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

    req.body = value; // Usar los valores validados y limpiados
    next();
  };
};

// Validación específica para email UNIMET (opcional)
const validateUnimetEmail = (req, res, next) => {
  const { email } = req.body;

  if (email && !REGEX_VENEZOLANOS.EMAIL_UNIMET.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten emails institucionales (@unimet.edu.ve o @correo.unimet.edu.ve)',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Validación de email basada en el rol del usuario
const validateEmailByRole = (req, res, next) => {
  const { email, role } = req.body;

  // Roles que requieren email institucional UNIMET
  const rolesConEmailUnimet = ['estudiante'];

  // Solo validar dominio si el rol lo requiere
  if (role && rolesConEmailUnimet.includes(role)) {
    if (email && !REGEX_VENEZOLANOS.EMAIL_UNIMET.test(email)) {
      return res.status(400).json({
        success: false,
        message: `El rol ${role} requiere un email institucional (@unimet.edu.ve o @correo.unimet.edu.ve)`,
        timestamp: new Date().toISOString(),
        details: {
          validationErrors: [{
            field: 'email',
            message: 'Debe usar un email institucional de la Universidad Metropolitana',
            value: email
          }]
        }
      });
    }
  }
  // Otros roles (admin) pueden usar cualquier dominio de email válido

  next();
};

module.exports = {
  // Middleware de validación
  validateLogin: validate(validateLogin),
  validateRegister: validate(validateRegister),
  validateRefreshToken: validate(validateRefreshToken),
  validateForgotPassword: validate(validateForgotPassword),
  validateResetPassword: validate(validateResetPassword),
  validateChangePassword: validate(validateChangePassword),
  validateUpdateProfile: validate(validateUpdateProfile),

  // Validaciones adicionales
  validateUnimetEmail,
  validateEmailByRole,

  // Esquemas exportados por si se necesitan en otros lugares
  schemas: {
    login: validateLogin,
    register: validateRegister,
    refreshToken: validateRefreshToken,
    forgotPassword: validateForgotPassword,
    resetPassword: validateResetPassword,
    changePassword: validateChangePassword,
    updateProfile: validateUpdateProfile
  }
};