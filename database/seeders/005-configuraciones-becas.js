const { ConfiguracionBeca } = require('../../src/models');

const configuracionesData = [
  // Beca Ayudantía
  {
    tipoBeca: 'Ayudantía',
    subtipoExcelencia: null,
    montoMensual: null, // Se otorga como descuento del 25%
    cuposDisponibles: 100,
    duracionMeses: 3,
    promedioMinimo: 12.00,
    semestreMinimo: 2,
    semestreMaximo: null,
    edadMaxima: 35,
    requisitosEspeciales: 'El estudiante debe estar activo, tener mínimo 3 créditos inscritos, no tener sanciones vigentes y estar solvente o tener plan de pago firmado. Debe completar 120 horas en modalidad regular (10h/semana) o 60 horas en modalidad intensiva (5h/semana). La evaluación se realiza en semana 11 (regular) o semana 5 (intensivo).',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Flujograma de carrera',
      'Plan de carrera avalado',
      'Comprobante de solvencia o plan de pago'
    ]
  },

  // Beca Impacto
  {
    tipoBeca: 'Impacto',
    subtipoExcelencia: null,
    montoMensual: null, // Descuento del 50%
    cuposDisponibles: 30,
    duracionMeses: 3,
    promedioMinimo: 15.00,
    semestreMinimo: 3,
    semestreMaximo: null,
    edadMaxima: 30,
    requisitosEspeciales: 'El estudiante debe demostrar impacto significativo en la comunidad universitaria a través de actividades extracurriculares, liderazgo estudiantil o proyectos de servicio comunitario. Se requiere carta de recomendación de un profesor y portafolio de actividades.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Carta de recomendación',
      'Portafolio de actividades extracurriculares',
      'Ensayo de motivación'
    ]
  },

  // Beca Exoneración de Pago
  {
    tipoBeca: 'Exoneración de Pago',
    subtipoExcelencia: null,
    montoMensual: null, // Exoneración del 100%
    cuposDisponibles: 50,
    duracionMeses: 3,
    promedioMinimo: null,
    semestreMinimo: 1,
    semestreMaximo: null,
    edadMaxima: null,
    requisitosEspeciales: 'Exclusivo para empleados de la Universidad Metropolitana y sus hijos. Debe presentar constancia de trabajo vigente del personal de la UNIMET o certificado de nacimiento que demuestre parentesco con empleado.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Constancia de trabajo (empleado)',
      'Certificado de nacimiento (hijos de empleados)',
      'Histórico de notas'
    ]
  },

  // Beca Formación Docente
  {
    tipoBeca: 'Formación Docente',
    subtipoExcelencia: null,
    montoMensual: null, // Descuento del 50%
    cuposDisponibles: 25,
    duracionMeses: 3,
    promedioMinimo: 15.00,
    semestreMinimo: 2,
    semestreMaximo: null,
    edadMaxima: 35,
    requisitosEspeciales: 'Programa dirigido a estudiantes interesados en la carrera docente. El estudiante debe participar activamente en actividades de formación pedagógica, talleres de metodología de enseñanza y programas de mentoría. Se requiere compromiso de asistencia a seminarios de educación superior.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Carta de motivación hacia la docencia',
      'Certificado de participación en actividades pedagógicas (si aplica)',
      'Carta de recomendación de un docente'
    ]
  },

  // Becas de Excelencia - 5 subtipos

  // 1. Excelencia Académica
  {
    tipoBeca: 'Excelencia',
    subtipoExcelencia: 'Académica',
    montoMensual: null, // Descuento del 75%
    cuposDisponibles: 20,
    duracionMeses: 3,
    promedioMinimo: 17.00,
    semestreMinimo: 2,
    semestreMaximo: 10,
    edadMaxima: 28,
    requisitosEspeciales: 'El estudiante debe demostrar excelencia académica sostenida con promedio igual o superior a 17 puntos. No puede tener materias reprobadas en su historial. Debe mantener carga académica completa (mínimo 15 créditos).',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas certificado',
      'Carta de motivación',
      'Reconocimientos académicos (si aplica)'
    ]
  },

  // 2. Excelencia Deportiva
  {
    tipoBeca: 'Excelencia',
    subtipoExcelencia: 'Deportiva',
    montoMensual: null, // Descuento del 75%
    cuposDisponibles: 15,
    duracionMeses: 3,
    promedioMinimo: 14.00,
    semestreMinimo: 1,
    semestreMaximo: null,
    edadMaxima: 30,
    requisitosEspeciales: 'El estudiante debe ser atleta destacado representando a la universidad en competencias regionales, nacionales o internacionales. Requiere aval del Departamento de Deportes y mantener entrenamiento regular.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Certificado de participación deportiva',
      'Carta de recomendación del entrenador',
      'Certificado médico deportivo'
    ]
  },

  // 3. Excelencia Artística
  {
    tipoBeca: 'Excelencia',
    subtipoExcelencia: 'Artística',
    montoMensual: null, // Descuento del 75%
    cuposDisponibles: 10,
    duracionMeses: 3,
    promedioMinimo: 14.00,
    semestreMinimo: 1,
    semestreMaximo: null,
    edadMaxima: 30,
    requisitosEspeciales: 'El estudiante debe demostrar talento artístico excepcional en áreas como música, teatro, danza, artes visuales u otras manifestaciones culturales. Debe participar activamente en eventos culturales de la universidad.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Portafolio artístico',
      'Certificados de participación en eventos',
      'Carta de recomendación de profesor de arte'
    ]
  },

  // 4. Excelencia en Emprendimiento
  {
    tipoBeca: 'Excelencia',
    subtipoExcelencia: 'Emprendimiento',
    montoMensual: null, // Descuento del 75%
    cuposDisponibles: 12,
    duracionMeses: 3,
    promedioMinimo: 15.00,
    semestreMinimo: 3,
    semestreMaximo: null,
    edadMaxima: 32,
    requisitosEspeciales: 'El estudiante debe tener un proyecto de emprendimiento activo con impacto demostrable. Requiere presentar plan de negocios, evidencia de ejecución y aval del Centro de Emprendimiento de la universidad.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Plan de negocios',
      'Evidencia de emprendimiento (RIF, registro mercantil, etc.)',
      'Carta de aval del Centro de Emprendimiento',
      'Pitch deck del proyecto'
    ]
  },

  // 5. Excelencia Cívica
  {
    tipoBeca: 'Excelencia',
    subtipoExcelencia: 'Cívico',
    montoMensual: null, // Descuento del 75%
    cuposDisponibles: 10,
    duracionMeses: 3,
    promedioMinimo: 14.00,
    semestreMinimo: 2,
    semestreMaximo: null,
    edadMaxima: 30,
    requisitosEspeciales: 'El estudiante debe demostrar compromiso excepcional con causas sociales y servicio comunitario. Requiere mínimo 100 horas de servicio comunitario documentadas en los últimos 12 meses y carta de recomendación de la organización beneficiada.',
    documentosRequeridos: [
      'Cédula de identidad',
      'Histórico de notas',
      'Certificado de horas de servicio comunitario',
      'Carta de recomendación de ONG o institución',
      'Ensayo sobre impacto social',
      'Evidencia fotográfica o audiovisual de actividades'
    ]
  }
];

module.exports = async () => {
  try {
    console.log('🌱 Iniciando seeder de configuraciones de becas...');

    for (const configData of configuracionesData) {
      const where = {
        tipoBeca: configData.tipoBeca,
        subtipoExcelencia: configData.subtipoExcelencia
      };

      const [configuracion, created] = await ConfiguracionBeca.findOrCreate({
        where,
        defaults: configData
      });

      const identificador = configuracion.obtenerIdentificador();
      if (created) {
        console.log(`  ✅ Configuración creada: ${identificador}`);
      } else {
        console.log(`  ℹ️  Configuración ya existe: ${identificador}`);
      }
    }

    console.log('✅ Configuraciones de becas inicializadas');
  } catch (error) {
    console.error('❌ Error en seeder de configuraciones de becas:', error);
    throw error;
  }
};
