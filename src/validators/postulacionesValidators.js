const Joi = require('joi');
const { normalizeDocumentUrls } = require('../utils/urlHelpers');

const createPostulacionSchema = Joi.object({
  // Datos personales
  nombre: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es requerido'
    }),

  cedula: Joi.string()
    .pattern(/^[VE]-\d{7,8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Formato de cédula inválido (debe ser V-XXXXXXXX o E-XXXXXXXX)',
      'any.required': 'La cédula es requerida'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Formato de email inválido',
      'any.required': 'El email es requerido'
    }),

  telefono: Joi.string()
    .min(7)
    .max(20)
    .required()
    .messages({
      'string.min': 'El teléfono debe tener al menos 7 caracteres',
      'string.max': 'El teléfono no puede exceder 20 caracteres',
      'any.required': 'El teléfono es requerido'
    }),

  fechaNacimiento: Joi.date()
    .required()
    .messages({
      'any.required': 'La fecha de nacimiento es requerida'
    }),

  estadoCivil: Joi.string()
    .valid('soltero', 'casado', 'divorciado', 'viudo', 'union-estable')
    .required()
    .messages({
      'any.only': 'Estado civil inválido. Las opciones permitidas son: soltero, casado, divorciado, viudo, union-estable',
      'any.required': 'El estado civil es requerido'
    }),

  // Datos académicos
  tipoPostulante: Joi.string()
    .valid('estudiante-pregrado', 'estudiante-postgrado', 'estudiante-nuevo')
    .required()
    .messages({
      'any.only': 'Tipo de postulante inválido. Las opciones permitidas son: estudiante-pregrado, estudiante-postgrado, estudiante-nuevo',
      'any.required': 'El tipo de postulante es requerido'
    }),

  carrera: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'La carrera debe tener al menos 2 caracteres',
      'string.max': 'La carrera no puede exceder 100 caracteres',
      'any.required': 'La carrera es requerida'
    }),

  trimestre: Joi.string()
    .min(5)
    .max(10)
    .optional()
    .allow(null, '')
    .messages({
      'string.min': 'El trimestre debe tener al menos 5 caracteres',
      'string.max': 'El trimestre no puede exceder 10 caracteres'
    }),

  iaa: Joi.number()
    .min(0)
    .max(20)
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'El IAA debe ser mayor o igual a 0',
      'number.max': 'El IAA no puede ser mayor a 20'
    }),

  promedioBachillerato: Joi.number()
    .min(0)
    .max(20)
    .precision(2)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'El promedio de bachillerato debe ser mayor o igual a 0',
      'number.max': 'El promedio de bachillerato no puede ser mayor a 20'
    }),

  asignaturasAprobadas: Joi.number()
    .integer()
    .min(0)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Las asignaturas aprobadas deben ser mayor o igual a 0',
      'number.integer': 'Las asignaturas aprobadas debe ser un número entero'
    }),

  creditosInscritos: Joi.number()
    .integer()
    .min(3)
    .max(30)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Debe tener al menos 3 créditos inscritos',
      'number.max': 'No puede tener más de 30 créditos inscritos',
      'number.integer': 'Los créditos inscritos deben ser un número entero'
    }),

  // Datos de la beca
  tipoBeca: Joi.string()
    .valid('Ayudantía', 'Excelencia', 'Impacto', 'Exoneración de Pago', 'Formación Docente')
    .optional()
    .default('Ayudantía')
    .messages({
      'any.only': 'Tipo de beca inválido. Las opciones permitidas son: Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente'
    }),

  // Documentos (opcional al crear, pero se puede agregar)
  documentos: Joi.array()
    .items(
      Joi.object({
        tipo: Joi.string().required(),
        nombre: Joi.string().required(),
        url: Joi.string().optional(),
        path: Joi.string().optional()
      })
    )
    .optional()
    .custom((value, helpers) => {
      if (!value || !Array.isArray(value)) return value;

      // Normalizar URLs
      const normalizedDocs = normalizeDocumentUrls(value);

      // Validar cada URL normalizada
      for (let i = 0; i < normalizedDocs.length; i++) {
        const doc = normalizedDocs[i];
        if (doc.url) {
          try {
            new URL(doc.url);
          } catch (error) {
            return helpers.error('any.invalid', {
              message: `La URL del documento ${i + 1} es inválida: ${doc.url}`
            });
          }
        }
      }

      return normalizedDocs;
    }, 'Normalización y validación de URLs de documentos')
    .messages({
      'array.base': 'Los documentos deben ser un arreglo'
    })
}).custom((value, helpers) => {
  // Validación personalizada: IAA mínimo según tipo de postulante (solo si se proporciona IAA)
  if (value.iaa !== null && value.iaa !== undefined) {
    if (value.tipoPostulante === 'estudiante-pregrado' && value.iaa < 12) {
    return helpers.error('custom.iaaMinimoPregrado');
  }
  if (value.tipoPostulante === 'estudiante-postgrado' && value.iaa < 14) {
    return helpers.error('custom.iaaMinmoPostgrado');
  }
  }

  
  // Validación personalizada: promedio bachillerato requerido para estudiantes nuevos
  if (value.tipoPostulante === 'estudiante-nuevo' && !value.promedioBachillerato) {
    return helpers.error('custom.promedioBachilleratoRequerido');
  }

  return value;
}, 'Validaciones de reglas de negocio')
  .messages({
    'custom.iaaMinimoPregrado': 'El IAA mínimo para estudiantes de pregrado es 12 puntos',
    'custom.iaaMinmoPostgrado': 'El IAA mínimo para estudiantes de postgrado es 14 puntos',
    'custom.promedioBachilleratoRequerido': 'El promedio de bachillerato es requerido para estudiantes nuevos'
  });

const updatePostulacionSchema = Joi.object({
  // Datos personales (actualizables si la postulación está pendiente)
  nombre: Joi.string().min(2).max(100).optional(),
  cedula: Joi.string().pattern(/^[VE]-\d{7,8}$/).optional(),
  email: Joi.string().email().optional(),
  telefono: Joi.string().min(7).max(20).optional(),
  fechaNacimiento: Joi.date().optional(),
  estadoCivil: Joi.string()
    .valid('soltero', 'casado', 'divorciado', 'viudo', 'union-estable')
    .optional()
    .messages({
      'any.only': 'Estado civil inválido. Las opciones permitidas son: soltero, casado, divorciado, viudo, union-estable'
    }),

  // Datos académicos
  tipoPostulante: Joi.string()
    .valid('estudiante-pregrado', 'estudiante-postgrado', 'estudiante-nuevo')
    .optional()
    .messages({
      'any.only': 'Tipo de postulante inválido. Las opciones permitidas son: estudiante-pregrado, estudiante-postgrado, estudiante-nuevo'
    }),
  carrera: Joi.string().min(2).max(100).optional(),
  trimestre: Joi.string().min(5).max(10).optional(),
  iaa: Joi.number().min(0).max(20).precision(2).optional(),
  promedioBachillerato: Joi.number().min(0).max(20).precision(2).optional().allow(null),
  asignaturasAprobadas: Joi.number().integer().min(0).optional(),
  creditosInscritos: Joi.number().integer().min(3).max(30).optional(),

  // Datos de la beca
  tipoBeca: Joi.string()
    .valid('Ayudantía', 'Excelencia', 'Impacto', 'Exoneración de Pago', 'Formación Docente')
    .optional()
    .messages({
      'any.only': 'Tipo de beca inválido. Las opciones permitidas son: Ayudantía, Excelencia, Impacto, Exoneración de Pago, Formación Docente'
    }),

  // Documentos
  documentos: Joi.array().items(
    Joi.object({
      tipo: Joi.string().required(),
      nombre: Joi.string().required(),
      url: Joi.string().optional(),
      path: Joi.string().optional()
    })
  )
  .optional()
  .custom((value, helpers) => {
    if (!value || !Array.isArray(value)) return value;

    // Normalizar URLs
    const normalizedDocs = normalizeDocumentUrls(value);

    // Validar cada URL normalizada
    for (let i = 0; i < normalizedDocs.length; i++) {
      const doc = normalizedDocs[i];
      if (doc.url) {
        try {
          new URL(doc.url);
        } catch (error) {
          return helpers.error('any.invalid', {
            message: `La URL del documento ${i + 1} es inválida: ${doc.url}`
          });
        }
      }
    }

    return normalizedDocs;
  }, 'Normalización y validación de URLs de documentos')
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

const evaluacionSchema = Joi.object({
  observaciones: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Las observaciones deben tener al menos 20 caracteres',
      'string.max': 'Las observaciones no pueden exceder 2000 caracteres',
      'any.required': 'Las observaciones son requeridas'
    })
});

const verificarEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Formato de email inválido',
      'any.required': 'El email es requerido'
    })
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        timestamp: new Date().toISOString(),
        details: { validationErrors }
      });
    }

    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        timestamp: new Date().toISOString(),
        details: { validationErrors }
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  validateCreatePostulacion: validate(createPostulacionSchema),
  validateUpdatePostulacion: validate(updatePostulacionSchema),
  validateEvaluacion: validate(evaluacionSchema),
  validateVerificarEmail: validateQuery(verificarEmailSchema)
};