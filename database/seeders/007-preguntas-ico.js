'use strict';

/**
 * Seeder de preguntas ICO adaptadas a las carreras UNIMET.
 * Base: reactivos ICO (RIASEC) con saturaciones (Sat.).
 * Una pregunta por reactivo (74 total). A cada una se le asigna UNA carrera UNIMET
 * que tenga esa dimensión en su interest code, rotando entre carreras para que
 * el test sea corto pero con preguntas contextualizadas a varias carreras.
 */

const { CARRERAS_UNIMET } = require('../../src/config/carrerasUnimetSpecs');

const TIPO_TEST = 'ICO';

// Dimensión → letra RIASEC
const DIMENSION_A_LETRA = {
  Artístico: 'A',
  Realista: 'R',
  Social: 'S',
  Investigador: 'I',
  Convencional: 'C',
  Emprendedor: 'E',
};

// Reactivos ICO: [ dimension_principal, texto_reactivo, saturacion ]
const reactivosICO = [
  ['Artístico', 'Habilidad para crear expresiones artísticas', 0.79],
  ['Artístico', 'Creatividad para el arte y la estética', 0.78],
  ['Artístico', 'Expresividad artística', 0.72],
  ['Artístico', 'Expresar ideas de forma artística', 0.70],
  ['Artístico', 'Arte', 0.68],
  ['Artístico', 'Tomar parte en actividades artísticas, musicales o literarias', 0.67],
  ['Artístico', 'Tratar con creaciones literarias, musicales o artísticas', 0.65],
  ['Artístico', 'Originalidad y belleza en sus creaciones', 0.63],
  ['Artístico', 'Originalidad', 0.62],
  ['Artístico', 'Destrezas para escribir poesía, prosa, humor o música', 0.62],
  ['Artístico', 'Creatividad', 0.61],
  ['Artístico', 'Imaginativo/a', 0.56],
  ['Artístico', 'Utilizar la imaginación, la fantasía', 0.56],
  ['Realista', 'Habilidad para usar herramientas', 0.67],
  ['Realista', 'Trabajar manejando maquinaria', 0.65],
  ['Realista', 'Deseo de trabajar con materiales y máquinas', 0.62],
  ['Realista', 'Habilidad mecánica', 0.61],
  ['Realista', 'Tomar parte en actividades de esfuerzo', 0.61],
  ['Realista', 'Dispuesto a ensuciarse las manos', 0.61],
  ['Realista', 'Usar herramientas manuales o eléctricas', 0.60],
  ['Realista', 'Destreza manual', 0.60],
  ['Realista', 'Manejar máquinas o equipos motorizados', 0.58],
  ['Realista', 'Fuerza física', 0.56],
  ['Realista', 'Mantenimiento de maquinaria o equipamiento', 0.55],
  ['Realista', 'Valor, esfuerzo físico', 0.52],
  ['Realista', 'Llevar botas de trabajo, casco, ropa protectora', 0.46],
  ['Realista', 'Cuidadoso/a', 0.41],
  ['Realista', 'Hacer trabajos rutinarios', 0.32],
  ['Social', 'Empatía, comprender a los demás', 0.67],
  ['Social', 'Prestar servicio a los demás', 0.67],
  ['Social', 'Preocupación por los demás', 0.66],
  ['Social', 'Destrezas sociales, de relacionarse con los demás', 0.66],
  ['Social', 'Ayudar a otras personas', 0.62],
  ['Social', 'Dotes para las relaciones interpersonales', 0.62],
  ['Social', 'Habilidad para tratar o relacionarse con gente', 0.61],
  ['Social', 'Paciente', 0.59],
  ['Social', 'Prudente, con tacto', 0.58],
  ['Social', 'Humanitarismo', 0.57],
  ['Social', 'Cooperativo/a', 0.47],
  ['Social', 'Relacionarse con otras personas y preocuparse por su bienestar', 0.45],
  ['Social', 'Sentido práctico', 0.44],
  ['Investigador', 'Aptitudes científicas', 0.69],
  ['Investigador', 'Talento escolar, académico', 0.62],
  ['Investigador', 'Intelectual', 0.60],
  ['Investigador', 'Resolver problemas intelectuales o técnicos', 0.59],
  ['Investigador', 'Llevar a cabo experimentos', 0.55],
  ['Investigador', 'Analítico/a', 0.53],
  ['Investigador', 'Conocimientos escolares, académicos', 0.51],
  ['Investigador', 'Aplicar aptitudes o capacidades científicas', 0.50],
  ['Investigador', 'Llevar a cabo actividades de investigación', 0.48],
  ['Investigador', 'Descubrir nuevos conocimientos', 0.45],
  ['Investigador', 'Habilidad para resolver problemas matemáticos y científicos', 0.44],
  ['Investigador', 'Curiosidad', 0.36],
  ['Investigador', 'Descubrir hechos', 0.33],
  ['Convencional', 'Destrezas administrativas, de oficina', 0.74],
  ['Convencional', 'Realizar tareas administrativas con orden y precisión', 0.68],
  ['Convencional', 'Habilidad para manejar aparatos de oficina (fax, etc.)', 0.68],
  ['Convencional', 'Manejo ordenado y sistemático de archivos y registros', 0.68],
  ['Convencional', 'Práctico y eficiente en tareas administrativas', 0.66],
  ['Convencional', 'Llevar a cabo actividades rutinarias de oficina', 0.59],
  ['Convencional', 'Capacidad para ajustarse a modelos o metas precisas', 0.44],
  ['Convencional', 'Seguir instrucciones', 0.42],
  ['Convencional', 'Concreto, preciso', 0.39],
  ['Convencional', 'Atención a los detalles, ser minucioso', 0.33],
  ['Convencional', 'Metódico/a, sujeto a reglas, a normas', 0.30],
  ['Emprendedor', 'Tener iniciativas empresariales', 0.74],
  ['Emprendedor', 'Idear planes para competir en el mercado', 0.65],
  ['Emprendedor', 'Ser emprendedor y tener iniciativa empresarial', 0.61],
  ['Emprendedor', 'Habilidad para las ventas', 0.58],
  ['Emprendedor', 'Poder', 0.58],
  ['Emprendedor', 'Vender productos o servicios', 0.52],
  ['Emprendedor', 'Habilidad para ser líder', 0.52],
  ['Emprendedor', 'Habilidad para dirigir', 0.48],
  ['Emprendedor', 'Destrezas directivas, de ejecutivo', 0.43],
  ['Emprendedor', 'Materialista', 0.43],
  ['Emprendedor', 'Dirigir, mandar, mostrarse como líder', 0.42],
  ['Emprendedor', 'Ambicioso', 0.40],
  ['Emprendedor', 'Interesado por su estatus o nivel social', 0.33],
];

function pesoDesdeSaturacion(sat) {
  if (sat >= 0.70) return 'alta';
  if (sat >= 0.55) return 'media';
  return 'baja';
}

/** Carreras cuyo interest code contiene la letra de la dimensión (ej. R, I, A). */
function carrerasParaDimension(dimension) {
  const letra = DIMENSION_A_LETRA[dimension];
  if (!letra) return [];
  return CARRERAS_UNIMET.filter((c) => (c.interestCode || '').toUpperCase().includes(letra));
}

/**
 * Genera el texto de la pregunta: reactivo + contexto de la carrera UNIMET
 * (nombre, facultad y ejemplos con verbos/áreas).
 */
function textoPreguntaAdaptada(reactivo, carrera) {
  const facultad = carrera.faculty ? ` (${carrera.faculty})` : '';
  const ejemplos = [];
  if (carrera.verbos && carrera.verbos.length) {
    ejemplos.push(carrera.verbos.slice(0, 3).join(', ').toLowerCase());
  }
  if (carrera.area) {
    ejemplos.push(carrera.area);
  }
  const contexto = ejemplos.length ? ` (por ejemplo: ${ejemplos.join('; ')})` : '';
  return `¿Te identificas con ${reactivo.toLowerCase()} en el ámbito de ${carrera.name}${facultad}?${contexto}`;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🌱 Iniciando seeder de preguntas ICO adaptadas a carreras UNIMET (1 pregunta por reactivo)...');

    const todasLasPreguntas = [];
    let codigoGlobal = 0;
    /** Por dimensión: índice para rotar la carrera asignada (0, 1, 2, ... % carreras.length). */
    const indiceCarreraPorDimension = {};

    for (const [dimension, reactivo, sat] of reactivosICO) {
      const carreras = carrerasParaDimension(dimension);
      const peso = pesoDesdeSaturacion(sat);
      codigoGlobal += 1;

      // Una sola pregunta por reactivo: se asigna UNA carrera rotando por dimensión
      const idx = (indiceCarreraPorDimension[dimension] || 0) % Math.max(carreras.length, 1);
      const carrera = carreras.length > 0 ? carreras[idx] : null;
      if (carreras.length > 0) indiceCarreraPorDimension[dimension] = (indiceCarreraPorDimension[dimension] || 0) + 1;

      const codigo = `ICO-${DIMENSION_A_LETRA[dimension] || 'X'}-${String(codigoGlobal).padStart(3, '0')}`;
      todasLasPreguntas.push({
        id: Sequelize.literal('gen_random_uuid()'),
        codigo_pregunta: codigo,
        tipo_test: TIPO_TEST,
        dimension_principal: dimension,
        dimension_secundaria: JSON.stringify([]),
        texto__pregunta: carrera
          ? textoPreguntaAdaptada(reactivo, carrera)
          : `¿Te identificas con: ${reactivo}?`,
        tipo_pregunta: 'directa',
        peso_pregunta: peso,
        carreras_relacionadas: JSON.stringify(carrera ? [carrera.name] : []),
        correlaciones_academicas: JSON.stringify({}),
        instrucciones_respuesta: JSON.stringify(['Sí', 'No']),
        efectividad_historica: 0.50,
        veces_usada: 0,
        veces_efectiva: 0,
        activa: true,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    try {
      await queryInterface.bulkDelete('preguntas_orientacion', { tipo_test: TIPO_TEST }, {});
      await queryInterface.bulkInsert('preguntas_orientacion', todasLasPreguntas);
      console.log(`✅ Se insertaron ${todasLasPreguntas.length} preguntas ICO (1 por reactivo, adaptadas a carreras UNIMET).`);
    } catch (error) {
      console.error('❌ Error en seeder ICO:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('preguntas_orientacion', { tipo_test: TIPO_TEST }, {});
  },
};
