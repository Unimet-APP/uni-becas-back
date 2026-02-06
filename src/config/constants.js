// Roles del sistema
const ROLES = {
  ESTUDIANTE: 'estudiante',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin', 
  ASPIRANTE: 'aspirante',
  ESPECIALISTA: 'especialista'
};

// Estados de postulación
const ESTADOS_POSTULACION = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En Revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada'
};

// Estados de estudiante becario
const ESTADOS_BECARIO = {
  ACTIVA: 'Activa',
  SUSPENDIDA: 'Suspendida',
  CULMINADA: 'Culminada',
  CANCELADA: 'Cancelada'
};

// Estados de plaza
const ESTADOS_PLAZA = {
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
  COMPLETA: 'Completa'
};

// Estados de reporte de actividad
const ESTADOS_REPORTE = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  EN_REVISION: 'En Revisión'
};

// Tipos de beca
const TIPOS_BECA = {
  AYUDANTIA: 'Ayudantía',
  IMPACTO: 'Impacto',
  EXCELENCIA: 'Excelencia',
  EXONERACION_PAGO: 'Exoneración de Pago',
  FORMACION_DOCENTE: 'Formación Docente'
};

// Estado civil
const ESTADO_CIVIL = {
  SOLTERO: 'soltero',
  CASADO: 'casado',
  DIVORCIADO: 'divorciado',
  VIUDO: 'viudo',
  UNION_ESTABLE: 'union-estable'
};

// Tipos de postulante
const TIPOS_POSTULANTE = {
  ESTUDIANTE_PREGRADO: 'estudiante-pregrado',
  ESTUDIANTE_POSTGRADO: 'estudiante-postgrado',
  ESTUDIANTE_NUEVO: 'estudiante-nuevo'
};

// Tipos de ayudantía
const TIPOS_AYUDANTIA = {
  ACADEMICA: 'academica',
  ADMINISTRATIVA: 'administrativa',
  INVESTIGACION: 'investigacion'
};

// Tipos de actividad para reportes
const TIPOS_ACTIVIDAD = {
  DOCENCIA: 'docencia',
  INVESTIGACION: 'investigacion',
  EXTENSION: 'extension',
  ADMINISTRATIVA: 'administrativa',
  APOYO_ACADEMICO: 'apoyo-academico',
  OTRAS: 'otras'
};

// Validaciones
const VALIDACIONES = {
  // Longitudes mínimas y máximas
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NOMBRE_MIN_LENGTH: 2,
  NOMBRE_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  TELEFONO_MAX_LENGTH: 20,
  CEDULA_MAX_LENGTH: 20,

  // Rangos numéricos
  IAA_MIN: 0,
  IAA_MAX: 20,
  IAA_MIN_PREGRADO: 12,
  IAA_MIN_POSTGRADO: 14,
  EDAD_MIN: 16,
  EDAD_MAX: 65,
  CREDITOS_MIN: 3,
  CREDITOS_MAX: 30,
  SEMESTRE_MIN: 1,
  SEMESTRE_MAX: 15,

  // Horas y capacidades
  HORAS_SEMANALES_REGULAR: 10,
  HORAS_SEMANALES_INTENSIVO: 5,
  HORAS_TOTALES_REGULAR: 120,
  HORAS_TOTALES_INTENSIVO: 60,
  PLAZA_CAPACIDAD_MIN: 1,
  PLAZA_CAPACIDAD_MAX: 10,
  HORAS_ACTIVIDAD_MIN: 0.25,
  HORAS_ACTIVIDAD_MAX: 12,

  // Descuentos
  DESCUENTO_AYUDANTIA: 25.00,

  // Archivos
  MAX_FILE_SIZE: 10485760, // 10MB (estandarizado en todo el sistema)
  ALLOWED_FILE_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  ALLOWED_FILE_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png']
};

// Documentos requeridos por tipo de beca
const DOCUMENTOS_REQUERIDOS = {
  [TIPOS_BECA.AYUDANTIA]: [
    'cedula',
    'historico_notas',
    'flujograma_carrera',
    'plan_carrera_avalado'
  ],
  [TIPOS_BECA.IMPACTO]: [
    'cedula',
    'historico_notas',
    'curriculum',
    'carta_motivacion'
  ],
  [TIPOS_BECA.EXCELENCIA]: [
    'cedula',
    'historico_notas',
    'certificados_logros',
    'curriculum'
  ],
  [TIPOS_BECA.EXONERACION_PAGO]: [
    'cedula',
    'historico_notas',
    'constancia_laboral',
    'curriculum'
  ],
  [TIPOS_BECA.FORMACION_DOCENTE]: [
    'cedula',
    'historico_notas'
  ]
};

// Períodos académicos
const PERIODOS_ACADEMICOS = {
  FORMATOS: [
    /^\d{4}-\d{1}$/, // Formato: 2024-1, 2024-2, 2024-3
    /^\d{4}[ABC]$/   // Formato: 2024A, 2024B, 2024C
  ]
};

// Expresiones regulares venezolanas
const REGEX_VENEZOLANOS = {
  CEDULA: /^[VE]-\d{7,8}$/,
  // TELEFONO: Validación simplificada - solo longitud 7-20 caracteres (sin formato específico)
  // EMAIL_UNIMET: Permite subdominios (ej: estudiantes.unimet.edu.ve, correo.unimet.edu.ve)
  EMAIL_UNIMET: /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*unimet\.edu\.ve$/,
  // EMAIL especifico para personal/profesores : @unimet.edu.ve
  EMAIL_PERSONAL_UNIMET: /^[a-zA-Z0-9._%+-]+@unimet\.edu\.ve$/,
  // EMAIL especifico para estudiantes: @correo.unimet.edu.ve (convertir aspirante → estudiante)
  EMAIL_ESTUDIANTE_UNIMET: /^[a-zA-Z0-9._%+-]+@correo\.unimet\.edu\.ve$/
};

// Mensajes de error comunes
const MENSAJES_ERROR = {
  // Autenticación
  CREDENCIALES_INVALIDAS: 'Email o contraseña incorrectos',
  TOKEN_EXPIRADO: 'Sesión expirada. Inicia sesión nuevamente',
  TOKEN_INVALIDO: 'Token de autenticación inválido',
  ACCESO_DENEGADO: 'No tienes permisos para realizar esta acción',
  USUARIO_INACTIVO: 'Usuario inactivo. Contacta al administrador',
  EMAIL_NO_VERIFICADO: 'Debes verificar tu email antes de continuar',

  // Validación
  CAMPO_REQUERIDO: 'Este campo es requerido',
  FORMATO_INVALIDO: 'Formato inválido',
  CEDULA_INVALIDA: 'Formato de cédula inválido (ej: V-12345678 o E-12345678)',
  TELEFONO_INVALIDO: 'Formato de teléfono inválido (ej: +58 123 1234567)',
  EMAIL_INVALIDO: 'Formato de email inválido',
  PASSWORD_DEBIL: 'Contraseña muy débil',

  // Negocio
  POSTULACION_EXISTENTE: 'Ya tienes una postulación activa',
  BECA_ACTIVA: 'Ya tienes una beca activa',
  IAA_INSUFICIENTE: 'IAA insuficiente para el tipo de beca',
  CREDITOS_INSUFICIENTES: 'Mínimo 3 créditos inscritos requeridos',
  PLAZA_NO_DISPONIBLE: 'Plaza no disponible',
  PLAZA_COMPLETA: 'Plaza completa',
  HORAS_EXCEDIDAS: 'Horas exceden el límite permitido',
  EVALUACION_REQUERIDA: 'Evaluación requerida antes de continuar',

  // Recursos
  USUARIO_NO_ENCONTRADO: 'Usuario no encontrado',
  POSTULACION_NO_ENCONTRADA: 'Postulación no encontrada',
  PLAZA_NO_ENCONTRADA: 'Plaza no encontrada',
  REPORTE_NO_ENCONTRADO: 'Reporte no encontrado',
  RECURSO_NO_ENCONTRADO: 'Recurso no encontrado'
};

// Configuración de paginación
const PAGINACION = {
  LIMITE_DEFAULT: 10,
  LIMITE_MAXIMO: 100,
  PAGINA_DEFAULT: 1
};

// Configuración de logs
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

module.exports = {
  ROLES,
  ESTADOS_POSTULACION,
  ESTADOS_BECARIO,
  ESTADOS_PLAZA,
  ESTADOS_REPORTE,
  TIPOS_BECA,
  ESTADO_CIVIL,
  TIPOS_POSTULANTE,
  TIPOS_AYUDANTIA,
  TIPOS_ACTIVIDAD,
  VALIDACIONES,
  DOCUMENTOS_REQUERIDOS,
  PERIODOS_ACADEMICOS,
  REGEX_VENEZOLANOS,
  MENSAJES_ERROR,
  PAGINACION,
  LOG_LEVELS
};