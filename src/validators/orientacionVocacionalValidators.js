const Joi = require('joi');

// Schema para iniciar test
const iniciarTestSchema = Joi.object({
  tipoTest: Joi.string().valid('Holland_RIASEC', 'Kuder').required()
    .messages({
      'any.only': 'El tipo de test debe ser Holland_RIASEC o Kuder',
      'any.required': 'El tipo de test es requerido'
    })
});

// Schema para guardar respuestas ronda 1
// La respuesta puede ser:
// - Booleano (true/false) para preguntas directas
// - Número (índice de opción) para preguntas con opciones múltiples
// - String (texto de la opción) para preguntas con opciones múltiples
// - Objeto con información de la selección
const respuestaSchema = Joi.object({
  preguntaId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la pregunta debe ser un UUID válido',
      'any.required': 'El ID de la pregunta es requerido'
    }),
  respuesta: Joi.alternatives()
    .try(
      // Booleanos y sus variantes
      Joi.boolean(),
      Joi.string().valid('true', 'false', '1', '0', 'True', 'False'),
      Joi.number().integer().valid(0, 1),
      // Números (índices de opciones)
      Joi.number().integer().min(0),
      // Strings (texto de opciones)
      Joi.string().min(1),
      // Objetos con información de selección
      Joi.object({
        opcionSeleccionada: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        indice: Joi.number().integer().min(0).optional(),
        valor: Joi.alternatives().try(Joi.boolean(), Joi.string(), Joi.number()).optional()
      })
    )
    .required()
    .messages({
      'any.required': 'La respuesta es requerida'
    }),
  respuestaCorrecta: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid('true', 'false', '1', '0'),
      Joi.number().integer().valid(0, 1)
    )
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
      }
      if (typeof value === 'number') return value === 1;
      return value;
    }),
  dimensionPredicha: Joi.string().optional(),
  tiempoRespuesta: Joi.number().integer().min(0).optional(),
  nivelSeguridad: Joi.string().valid('seguro', 'no_seguro').optional(),
  // Campos adicionales para preguntas con opciones
  opcionSeleccionada: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  indiceOpcion: Joi.number().integer().min(0).optional()
});

const guardarRespuestasRonda1Schema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    }),
  respuestas: Joi.array().items(respuestaSchema).min(1).required()
    .messages({
      'array.min': 'Debe enviar al menos una respuesta',
      'any.required': 'Las respuestas son requeridas'
    })
});

// Schema para guardar respuestas ronda 2
const guardarRespuestasRonda2Schema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    }),
  respuestas: Joi.array().items(respuestaSchema).min(1).required()
    .messages({
      'array.min': 'Debe enviar al menos una respuesta',
      'any.required': 'Las respuestas son requeridas'
    })
});

// Schema para sesionId en params
const sesionIdParamSchema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'El ID de la sesión debe ser un UUID válido',
      'any.required': 'El ID de la sesión es requerido'
    })
});

// Schema para guardar respuestas test ICO (una sola ronda, todas las preguntas)
// Acepta escala Likert ('Frecuentemente','A veces','Nunca' o 2,1,0) y boolean por backward compat
const respuestaICOSchema = Joi.object({
  pregunta_id: Joi.string().uuid().optional(),
  preguntaId: Joi.string().uuid().optional(),
  respuesta: Joi.alternatives().try(
    Joi.string().valid('Frecuentemente', 'A veces', 'Nunca'),
    Joi.number().valid(0, 1, 2),
    Joi.boolean(),
    Joi.string().valid('true', 'false', '1', '0')
  ).required()
    .messages({ 'any.required': 'respuesta es requerida' }),
  tiempo_respuesta: Joi.number().integer().min(0).optional(),
  nivel_seguridad: Joi.string().valid('seguro', 'no_seguro').optional(),
}).or('pregunta_id', 'preguntaId');

const guardarRespuestasICOSchema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({ 'string.guid': 'sesionId debe ser UUID válido', 'any.required': 'sesionId es requerido' }),
  respuestas: Joi.array().items(respuestaICOSchema).min(1).required()
    .messages({ 'array.min': 'Debe enviar al menos una respuesta', 'any.required': 'Las respuestas son requeridas' }),
}).custom((value) => {
  if (value.respuestas) {
    value.respuestas = value.respuestas.map(r => ({
      ...r,
      pregunta_id: r.pregunta_id || r.preguntaId,
    }));
  }
  return value;
});

// Schema para analizar cambio de carrera
const analizarCambioCarreraSchema = Joi.object({
  nuevaCarreraId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'El ID de la carrera debe ser un número',
      'number.positive': 'El ID de la carrera debe ser positivo',
      'any.required': 'El ID de la nueva carrera es requerido'
    })
});

// Middleware de validación
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      source === 'body' ? req.body : req.params,
      { 
        abortEarly: false,
        convert: true, // Convertir valores automáticamente
        stripUnknown: false // No eliminar campos desconocidos
      }
    );
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.details.map(d => d.message)
      });
    }
    // Reemplazar el objeto original con el valor validado y convertido
    if (source === 'body') {
      req.body = value;
    } else {
      req.params = value;
    }
    next();
  };
};

// Params: sesionId para rutas ICO
const sesionIdParamICOSchema = Joi.object({
  sesionId: Joi.string().uuid().required()
    .messages({ 'string.guid': 'sesionId debe ser UUID válido', 'any.required': 'sesionId es requerido' }),
});

// Schema para actualizar trayectoria académica (todos los campos opcionales)
// materias_por_ano_lapso: { "1": { "1": [{ materia, nota }], "2": [...], "3": [...] }, "2": { ... }, ... }
// materias_por_area: [{ area: "Matemática", materias: [{ nombre, nota }] }, ...]
const materiaNotaSchema = Joi.object({
  materia: Joi.string().allow('').optional(),
  nombre: Joi.string().allow('').optional(),
  nota: Joi.number().min(0).max(20).optional(),
}).or('materia', 'nombre');

const actualizarTrayectoriaSchema = Joi.object({
  promediosPorAno: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(20)).optional(),
  promedioGeneral: Joi.number().min(0).max(20).optional(),
  gradoActual: Joi.string().max(50).allow('').optional(),
  materiasDestacadas: Joi.array().items(Joi.string()).optional(),
  actividadesExtracurriculares: Joi.array().items(Joi.string()).optional(),
  proyectosRealizados: Joi.array().items(Joi.string()).optional(),
  materiasPorAnoLapso: Joi.object().pattern(
    Joi.string(), // año "1".."5"
    Joi.object().pattern(
      Joi.string(), // lapso "1","2","3" o "anual"
      Joi.array().items(materiaNotaSchema)
    )
  ).optional(),
  materiasPorArea: Joi.array().items(
    Joi.object({
      area: Joi.string().required(),
      materias: Joi.array().items(materiaNotaSchema).optional().default([]),
    })
  ).optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

// Dimensiones RIASEC válidas
const DIMENSIONES_RIASEC = ['Realista', 'Investigador', 'Artístico', 'Social', 'Emprendedor', 'Convencional'];

// instrucciones_respuesta: array de strings (ej. ["Sí", "No"]) u objeto con tipo + opciones para el especialista
const TIPOS_INSTRUCCIONES = ['si_no', 'opciones_multiples', 'dos_opciones', 'mas_de_dos_opciones'];
const instruccionesRespuestaSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string()),
  Joi.object({
    tipo: Joi.string().valid(...TIPOS_INSTRUCCIONES).optional()
      .messages({ 'any.only': `tipo debe ser uno de: ${TIPOS_INSTRUCCIONES.join(', ')}` }),
    opciones: Joi.array().items(Joi.string()).optional().default([]),
  })
);

const createPreguntaSchema = Joi.object({
  codigo_pregunta: Joi.string().max(50).required()
    .messages({ 'any.required': 'El código de pregunta es requerido' }),
  tipo_test: Joi.string().valid('Kuder', 'Holland_RIASEC', 'Personalizado', 'ICO').required()
    .messages({ 'any.only': 'tipo_test debe ser Kuder, Holland_RIASEC, Personalizado o ICO' }),
  dimension_principal: Joi.string().valid(...DIMENSIONES_RIASEC).required()
    .messages({ 'any.only': 'dimension_principal debe ser una dimensión RIASEC' }),
  texto__pregunta: Joi.string().min(1).required()
    .messages({ 'any.required': 'El texto de la pregunta es requerido' }),
  tipo_pregunta: Joi.string().valid('directa', 'comparativa', 'situacional', 'proyectiva').optional().default('directa'),
  peso_pregunta: Joi.string().valid('alta', 'media', 'baja').optional().default('media'),
  dimension_secundaria: Joi.array().items(Joi.string().valid(...DIMENSIONES_RIASEC)).optional().default([]),
  instrucciones_pregunta: Joi.string().allow('').optional(),
  instrucciones_respuesta: instruccionesRespuestaSchema.optional().default([]),
  carreras_relacionadas: Joi.array().optional().default([]),
  correlaciones_academicas: Joi.object().optional().default({}),
  activa: Joi.boolean().optional().default(true),
});

const updatePreguntaSchema = Joi.object({
  codigo_pregunta: Joi.string().max(50).optional(),
  tipo_test: Joi.string().valid('Kuder', 'Holland_RIASEC', 'Personalizado', 'ICO').optional(),
  dimension_principal: Joi.string().valid(...DIMENSIONES_RIASEC).optional(),
  texto__pregunta: Joi.string().min(1).optional(),
  tipo_pregunta: Joi.string().valid('directa', 'comparativa', 'situacional', 'proyectiva').optional(),
  peso_pregunta: Joi.string().valid('alta', 'media', 'baja').optional(),
  dimension_secundaria: Joi.array().items(Joi.string().valid(...DIMENSIONES_RIASEC)).optional(),
  instrucciones_pregunta: Joi.string().allow('').optional(),
  instrucciones_respuesta: instruccionesRespuestaSchema.optional(),
  carreras_relacionadas: Joi.array().optional(),
  correlaciones_academicas: Joi.object().optional(),
  activa: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar' });

const preguntaIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({ 'string.guid': 'ID de pregunta inválido' }),
});

module.exports = {
  validateIniciarTest: validate(iniciarTestSchema),
  validateGuardarRespuestasRonda1: validate(guardarRespuestasRonda1Schema),
  validateGuardarRespuestasRonda2: validate(guardarRespuestasRonda2Schema),
  validateSesionIdParam: validate(sesionIdParamSchema, 'params'),
  validateAnalizarCambioCarrera: validate(analizarCambioCarreraSchema),
  validateGuardarRespuestasICO: validate(guardarRespuestasICOSchema),
  validateSesionIdParamICO: validate(sesionIdParamICOSchema, 'params'),
  validateActualizarTrayectoria: validate(actualizarTrayectoriaSchema),
  validateCreatePregunta: validate(createPreguntaSchema),
  validateUpdatePregunta: validate(updatePreguntaSchema),
  validatePreguntaIdParam: validate(preguntaIdParamSchema, 'params'),
};
