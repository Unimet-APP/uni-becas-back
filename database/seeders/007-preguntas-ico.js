'use strict';

/**
 * Seeder de preguntas ICO — versión situacional / vida cotidiana.
 *
 * Cada reactivo del análisis factorial ICO (RIASEC) se traduce en una
 * pregunta abierta y cotidiana que NO menciona carreras ni ámbitos
 * profesionales. La correlación con carreras UNIMET ocurre mediante el
 * mapeo dimensión → interestCode que ya existe en carrerasUnimetSpecs.
 *
 * Escala Likert de 3 niveles:
 *   Frecuentemente (2 pts) — A veces (1 pt) — Nunca (0 pts)
 *
 * Total: 78 preguntas (13 A + 15 R + 13 S + 13 I + 11 C + 13 E).
 */

const { CARRERAS_UNIMET } = require('../../src/config/carrerasUnimetSpecs');

const TIPO_TEST = 'ICO';

const DIMENSION_A_LETRA = {
  Artístico: 'A',
  Realista: 'R',
  Social: 'S',
  Investigador: 'I',
  Convencional: 'C',
  Emprendedor: 'E',
};

// ───────────────────────────────────────────────────────────────────────
// Reactivos ICO con pregunta situacional.
// Formato: [dimensión, reactivo_original, saturación, pregunta_situacional]
// ───────────────────────────────────────────────────────────────────────

const reactivosICO = [
  // ═══════════════  ARTÍSTICO (A) — 13 reactivos  ═══════════════
  [
    'Artístico',
    'Habilidad para crear expresiones artísticas',
    0.79,
    '¿Disfrutas crear dibujos, pinturas, fotografías o cualquier tipo de expresión visual que refleje tu estilo personal?',
  ],
  [
    'Artístico',
    'Creatividad para el arte y la estética',
    0.78,
    '¿Te detienes a observar y apreciar la belleza en los detalles de tu entorno, como la arquitectura, los colores o los diseños?',
  ],
  [
    'Artístico',
    'Expresividad artística',
    0.72,
    '¿Prefieres expresar lo que sientes a través del arte (dibujando, escribiendo, cantando o bailando) en lugar de solo hablarlo?',
  ],
  [
    'Artístico',
    'Expresar ideas de forma artística',
    0.70,
    '¿Cuando tienes una idea o un sentimiento fuerte, buscas plasmarlo en algo creativo como un texto, una ilustración o un video?',
  ],
  [
    'Artístico',
    'Arte',
    0.68,
    '¿Dedicas parte de tu tiempo libre a actividades artísticas como pintar, tocar un instrumento, actuar o diseñar?',
  ],
  [
    'Artístico',
    'Tomar parte en actividades artísticas, musicales o literarias',
    0.67,
    '¿Te entusiasma participar en eventos culturales como obras de teatro, exposiciones, recitales o clubes de lectura?',
  ],
  [
    'Artístico',
    'Tratar con creaciones literarias, musicales o artísticas',
    0.65,
    '¿Disfrutas analizar películas, canciones, libros o piezas artísticas más allá de solo consumirlas?',
  ],
  [
    'Artístico',
    'Originalidad y belleza en sus creaciones',
    0.63,
    '¿Cuando realizas un trabajo o proyecto, te importa que tenga un toque personal y estéticamente atractivo, más allá de cumplir con lo pedido?',
  ],
  [
    'Artístico',
    'Originalidad',
    0.62,
    '¿Prefieres hacer las cosas de una manera diferente y personal en lugar de seguir lo que todos hacen?',
  ],
  [
    'Artístico',
    'Destrezas para escribir poesía, prosa, humor o música',
    0.62,
    '¿Te resulta natural escribir relatos, poemas, letras de canciones o textos con humor?',
  ],
  [
    'Artístico',
    'Creatividad',
    0.61,
    '¿Te gusta inventar soluciones poco convencionales o pensar "fuera de la caja" cuando enfrentas un reto?',
  ],
  [
    'Artístico',
    'Imaginativo/a',
    0.56,
    '¿Te descubres frecuentemente imaginando mundos, historias o escenarios que no existen?',
  ],
  [
    'Artístico',
    'Utilizar la imaginación, la fantasía',
    0.56,
    '¿Prefieres abordar tus proyectos con ideas originales y creativas en lugar de seguir instrucciones rígidas o manuales?',
  ],

  // ═══════════════  REALISTA (R) — 15 reactivos  ═══════════════
  [
    'Realista',
    'Habilidad para usar herramientas',
    0.67,
    '¿Disfrutas realizar actividades donde tengas que armar, reparar o construir objetos usando tus manos y herramientas?',
  ],
  [
    'Realista',
    'Trabajar manejando maquinaria',
    0.65,
    '¿Te atrae la idea de operar máquinas, equipos electrónicos o aparatos tecnológicos para lograr un resultado concreto?',
  ],
  [
    'Realista',
    'Deseo de trabajar con materiales y máquinas',
    0.62,
    '¿Prefieres trabajar con materiales tangibles (madera, metal, circuitos, componentes) en lugar de solo con ideas abstractas o documentos?',
  ],
  [
    'Realista',
    'Habilidad mecánica',
    0.61,
    '¿Cuando un aparato se daña en tu casa, intentas abrirlo y repararlo por tu cuenta antes de llamar a un técnico?',
  ],
  [
    'Realista',
    'Tomar parte en actividades de esfuerzo',
    0.61,
    '¿Disfrutas de actividades físicas que requieran esfuerzo y resistencia, como deportes, caminatas largas o trabajo al aire libre?',
  ],
  [
    'Realista',
    'Dispuesto a ensuciarse las manos',
    0.61,
    '¿No te molesta ensuciarte las manos al trabajar en una actividad práctica como jardinería, mecánica o cocina?',
  ],
  [
    'Realista',
    'Usar herramientas manuales o eléctricas',
    0.60,
    '¿Te sientes cómodo/a usando herramientas como destornilladores, taladros, multímetros o soldadores?',
  ],
  [
    'Realista',
    'Destreza manual',
    0.60,
    '¿Se te facilita realizar tareas que requieren precisión con las manos, como modelar, ensamblar piezas o hacer manualidades detalladas?',
  ],
  [
    'Realista',
    'Manejar máquinas o equipos motorizados',
    0.58,
    '¿Te genera interés aprender a manejar maquinaria especializada, drones, impresoras 3D u otros equipos tecnológicos?',
  ],
  [
    'Realista',
    'Fuerza física',
    0.56,
    '¿Te sientes cómodo/a realizando tareas que demanden esfuerzo físico, como cargar materiales, montar estructuras o trabajar de pie por largos períodos?',
  ],
  [
    'Realista',
    'Mantenimiento de maquinaria o equipamiento',
    0.55,
    '¿Te interesa entender cómo funcionan los equipos y aparatos para poder darles mantenimiento o mejorarlos?',
  ],
  [
    'Realista',
    'Valor, esfuerzo físico',
    0.52,
    '¿Estás dispuesto/a a asumir retos que impliquen esfuerzo físico y trabajo en condiciones exigentes?',
  ],
  [
    'Realista',
    'Llevar botas de trabajo, casco, ropa protectora',
    0.46,
    '¿Te sentirías cómodo/a trabajando en entornos donde debas usar equipo de protección como cascos, guantes o botas de seguridad?',
  ],
  [
    'Realista',
    'Cuidadoso/a',
    0.41,
    '¿Eres una persona cuidadosa y meticulosa al realizar tareas prácticas donde un error podría tener consecuencias?',
  ],
  [
    'Realista',
    'Hacer trabajos rutinarios',
    0.32,
    '¿Te resulta satisfactorio realizar tareas repetitivas y bien definidas que te permitan perfeccionar tu técnica con la práctica?',
  ],

  // ═══════════════  SOCIAL (S) — 13 reactivos  ═══════════════
  [
    'Social',
    'Empatía, comprender a los demás',
    0.67,
    '¿Sueles darte cuenta rápidamente de cómo se sienten las personas a tu alrededor y buscas formas de apoyarlas?',
  ],
  [
    'Social',
    'Prestar servicio a los demás',
    0.67,
    '¿Te sientes realizado/a cuando dedicas tu tiempo a ayudar a otros, ya sea como voluntario/a, tutor/a o simplemente escuchando a alguien que lo necesita?',
  ],
  [
    'Social',
    'Preocupación por los demás',
    0.66,
    '¿Te preocupas genuinamente por el bienestar de las personas que te rodean, incluso si no son cercanas a ti?',
  ],
  [
    'Social',
    'Destrezas sociales, de relacionarse con los demás',
    0.66,
    '¿Se te facilita entablar conversaciones y generar confianza con personas nuevas en diferentes contextos?',
  ],
  [
    'Social',
    'Ayudar a otras personas',
    0.62,
    '¿Cuando un compañero tiene dificultades con una tarea o materia, te ofreces espontáneamente a explicarle o ayudarle?',
  ],
  [
    'Social',
    'Dotes para las relaciones interpersonales',
    0.62,
    '¿Eres de esas personas que naturalmente unen grupos, resuelven malentendidos y fomentan la armonía entre los demás?',
  ],
  [
    'Social',
    'Habilidad para tratar o relacionarse con gente',
    0.61,
    '¿Te sientes cómodo/a interactuando con todo tipo de personas, adaptando tu forma de comunicarte según la situación?',
  ],
  [
    'Social',
    'Paciente',
    0.59,
    '¿Mantienes la calma y la paciencia cuando explicas algo a alguien que tarda en entender o cuando un proceso es lento?',
  ],
  [
    'Social',
    'Prudente, con tacto',
    0.58,
    '¿Sabes elegir las palabras adecuadas para dar una opinión sincera sin herir los sentimientos de los demás?',
  ],
  [
    'Social',
    'Humanitarismo',
    0.57,
    '¿Te conmueven las situaciones de injusticia social y sientes el deseo de contribuir a mejorar la vida de los demás?',
  ],
  [
    'Social',
    'Cooperativo/a',
    0.47,
    '¿Prefieres trabajar en equipo y colaborar con otros en lugar de hacer las cosas solo/a?',
  ],
  [
    'Social',
    'Relacionarse con otras personas y preocuparse por su bienestar',
    0.45,
    '¿Consideras que construir relaciones significativas con las personas es una de las cosas más importantes de tu vida?',
  ],
  [
    'Social',
    'Sentido práctico',
    0.44,
    '¿Buscas soluciones prácticas y concretas cuando alguien te comparte un problema personal?',
  ],

  // ═══════════════  INVESTIGADOR (I) — 13 reactivos  ═══════════════
  [
    'Investigador',
    'Aptitudes científicas',
    0.69,
    '¿Te apasiona entender cómo funcionan las cosas desde un punto de vista científico, ya sea la naturaleza, la tecnología o el cuerpo humano?',
  ],
  [
    'Investigador',
    'Talento escolar, académico',
    0.62,
    '¿Te resulta natural destacar en el ámbito académico y disfrutas profundizar en los temas que estudias?',
  ],
  [
    'Investigador',
    'Intelectual',
    0.60,
    '¿Disfrutas de las conversaciones profundas sobre temas complejos como filosofía, ciencia, economía o política?',
  ],
  [
    'Investigador',
    'Resolver problemas intelectuales o técnicos',
    0.59,
    '¿Cuando te enfrentas a un problema complejo (un acertijo, un ejercicio de lógica, un error en un programa), te motiva resolverlo hasta encontrar la respuesta?',
  ],
  [
    'Investigador',
    'Llevar a cabo experimentos',
    0.55,
    '¿Te emociona la idea de diseñar un experimento o prueba para comprobar si una hipótesis es correcta?',
  ],
  [
    'Investigador',
    'Analítico/a',
    0.53,
    '¿Tiendes a descomponer los problemas en partes más pequeñas para entenderlos mejor antes de buscar una solución?',
  ],
  [
    'Investigador',
    'Conocimientos escolares, académicos',
    0.51,
    '¿Disfrutas aprender cosas nuevas por cuenta propia, como leer artículos, ver documentales o tomar cursos en línea?',
  ],
  [
    'Investigador',
    'Aplicar aptitudes o capacidades científicas',
    0.50,
    '¿Te interesa aplicar el método científico o el razonamiento lógico para resolver problemas de la vida cotidiana?',
  ],
  [
    'Investigador',
    'Llevar a cabo actividades de investigación',
    0.48,
    '¿Disfrutas buscar información a fondo sobre un tema que te intriga, consultando múltiples fuentes hasta sentir que realmente lo entiendes?',
  ],
  [
    'Investigador',
    'Descubrir nuevos conocimientos',
    0.45,
    '¿Te emociona la posibilidad de descubrir algo que nadie ha encontrado antes, ya sea una idea, un dato o una explicación?',
  ],
  [
    'Investigador',
    'Habilidad para resolver problemas matemáticos y científicos',
    0.44,
    '¿Te sientes cómodo/a trabajando con números, fórmulas y datos para resolver problemas cuantitativos?',
  ],
  [
    'Investigador',
    'Curiosidad',
    0.36,
    '¿Sueles preguntarte constantemente "¿por qué?" sobre cómo funcionan las cosas que te rodean?',
  ],
  [
    'Investigador',
    'Descubrir hechos',
    0.33,
    '¿Te motiva verificar la veracidad de una noticia o afirmación investigando por tu cuenta antes de aceptarla como cierta?',
  ],

  // ═══════════════  CONVENCIONAL (C) — 11 reactivos  ═══════════════
  [
    'Convencional',
    'Destrezas administrativas, de oficina',
    0.74,
    '¿Se te da bien organizar documentos, correos electrónicos, archivos digitales y mantener todo en su lugar?',
  ],
  [
    'Convencional',
    'Realizar tareas administrativas con orden y precisión',
    0.68,
    '¿Te genera satisfacción completar tareas administrativas (llenar formularios, cuadrar cuentas, organizar datos) con exactitud?',
  ],
  [
    'Convencional',
    'Habilidad para manejar aparatos de oficina (fax, etc.)',
    0.68,
    '¿Aprendes rápidamente a usar herramientas digitales como hojas de cálculo, bases de datos, software de gestión o plataformas administrativas?',
  ],
  [
    'Convencional',
    'Manejo ordenado y sistemático de archivos y registros',
    0.68,
    '¿Te genera tranquilidad tener tus horarios, archivos y tareas organizados bajo un sistema lógico que tú mismo/a controlas?',
  ],
  [
    'Convencional',
    'Práctico y eficiente en tareas administrativas',
    0.66,
    '¿Buscas la manera más eficiente y ordenada de completar las tareas, evitando pasos innecesarios?',
  ],
  [
    'Convencional',
    'Llevar a cabo actividades rutinarias de oficina',
    0.59,
    '¿Te sientes cómodo/a realizando actividades estructuradas y repetitivas que requieren atención y constancia?',
  ],
  [
    'Convencional',
    'Capacidad para ajustarse a modelos o metas precisas',
    0.44,
    '¿Te adaptas fácilmente a seguir procedimientos establecidos y cumplir metas con plazos definidos?',
  ],
  [
    'Convencional',
    'Seguir instrucciones',
    0.42,
    '¿Te resulta natural seguir instrucciones paso a paso para completar una tarea correctamente?',
  ],
  [
    'Convencional',
    'Concreto, preciso',
    0.39,
    '¿Prefieres dar respuestas directas y precisas en lugar de divagar o dar rodeos?',
  ],
  [
    'Convencional',
    'Atención a los detalles, ser minucioso',
    0.33,
    '¿Revisas varias veces tu trabajo para asegurarte de que no haya errores antes de entregarlo?',
  ],
  [
    'Convencional',
    'Metódico/a, sujeto a reglas, a normas',
    0.30,
    '¿Prefieres seguir un método o protocolo claro para realizar tus actividades en lugar de improvisar?',
  ],

  // ═══════════════  EMPRENDEDOR (E) — 13 reactivos  ═══════════════
  [
    'Emprendedor',
    'Tener iniciativas empresariales',
    0.74,
    '¿Se te ocurren frecuentemente ideas para crear un negocio, un producto o un servicio que resuelva un problema real?',
  ],
  [
    'Emprendedor',
    'Idear planes para competir en el mercado',
    0.65,
    '¿Disfrutas pensar en estrategias para hacer que un proyecto, emprendimiento o idea sea más exitoso que la competencia?',
  ],
  [
    'Emprendedor',
    'Ser emprendedor y tener iniciativa empresarial',
    0.61,
    '¿Has intentado vender algo, organizar un evento o crear un proyecto por tu cuenta sin que nadie te lo pidiera?',
  ],
  [
    'Emprendedor',
    'Habilidad para las ventas',
    0.58,
    '¿Se te facilita convencer a otros del valor de un producto, una idea o un proyecto que consideras bueno?',
  ],
  [
    'Emprendedor',
    'Poder',
    0.58,
    '¿Te motiva ocupar posiciones donde puedas influir en las decisiones y el rumbo de las cosas?',
  ],
  [
    'Emprendedor',
    'Vender productos o servicios',
    0.52,
    '¿Te sientes cómodo/a ofreciendo y promoviendo productos, servicios o ideas a otras personas?',
  ],
  [
    'Emprendedor',
    'Habilidad para ser líder',
    0.52,
    '¿Te sientes cómodo/a tomando la iniciativa en un grupo para organizar a otros y alcanzar una meta común?',
  ],
  [
    'Emprendedor',
    'Habilidad para dirigir',
    0.48,
    '¿Te resulta natural coordinar y dirigir las actividades de un equipo, delegando tareas y asegurando que se cumplan los objetivos?',
  ],
  [
    'Emprendedor',
    'Destrezas directivas, de ejecutivo',
    0.43,
    '¿Te atrae la idea de tomar decisiones estratégicas que afecten el futuro de una organización o proyecto?',
  ],
  [
    'Emprendedor',
    'Materialista',
    0.43,
    '¿Es importante para ti alcanzar estabilidad económica y disfrutar de los beneficios materiales que el éxito profesional puede ofrecer?',
  ],
  [
    'Emprendedor',
    'Dirigir, mandar, mostrarse como líder',
    0.42,
    '¿Cuando trabajas en grupo, tiendes a asumir el rol de líder que guía y motiva a los demás?',
  ],
  [
    'Emprendedor',
    'Ambicioso',
    0.40,
    '¿Te fijas metas altas y ambiciosas para tu futuro profesional y te esfuerzas constantemente por alcanzarlas?',
  ],
  [
    'Emprendedor',
    'Interesado por su estatus o nivel social',
    0.33,
    '¿Consideras que el reconocimiento social y profesional es una motivación importante en tu vida?',
  ],
];

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function pesoDesdeSaturacion(sat) {
  if (sat >= 0.70) return 'alta';
  if (sat >= 0.55) return 'media';
  return 'baja';
}

/** Devuelve los nombres de las carreras cuyo interestCode contiene la letra de la dimensión. */
function carrerasParaDimension(dimension) {
  const letra = DIMENSION_A_LETRA[dimension];
  if (!letra) return [];
  return CARRERAS_UNIMET
    .filter((c) => (c.interestCode || '').toUpperCase().includes(letra))
    .map((c) => c.name);
}

// ───────────────────────────────────────────────────────────────────────
// Seeder
// ───────────────────────────────────────────────────────────────────────

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🌱 Iniciando seeder de preguntas ICO situacionales (escala Likert, 78 preguntas)...');

    const todasLasPreguntas = [];
    let codigoGlobal = 0;

    for (const [dimension, _reactivo, sat, preguntaSituacional] of reactivosICO) {
      codigoGlobal += 1;
      const peso = pesoDesdeSaturacion(sat);
      const letra = DIMENSION_A_LETRA[dimension] || 'X';
      const codigo = `ICO-${letra}-${String(codigoGlobal).padStart(3, '0')}`;

      todasLasPreguntas.push({
        id: Sequelize.literal('gen_random_uuid()'),
        codigo_pregunta: codigo,
        tipo_test: TIPO_TEST,
        dimension_principal: dimension,
        dimension_secundaria: JSON.stringify([]),
        texto__pregunta: preguntaSituacional,
        tipo_pregunta: 'situacional',
        peso_pregunta: peso,
        carreras_relacionadas: JSON.stringify(carrerasParaDimension(dimension)),
        correlaciones_academicas: JSON.stringify({}),
        instrucciones_respuesta: JSON.stringify(['Frecuentemente', 'A veces', 'Nunca']),
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
      console.log(`✅ Se insertaron ${todasLasPreguntas.length} preguntas ICO situacionales (escala Likert).`);
    } catch (error) {
      console.error('❌ Error en seeder ICO:', error.message);
      throw error;
    }
  },

  async down(queryInterface, _Sequelize) {
    return queryInterface.bulkDelete('preguntas_orientacion', { tipo_test: TIPO_TEST }, {});
  },
};
