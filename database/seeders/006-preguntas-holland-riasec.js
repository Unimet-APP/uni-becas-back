'use strict';

/**
 * Seeder de preguntas para el Test de Holland RIASEC
 * Versión final corregida: Sin dependencias de modelos y con mapeo exacto de columnas.
 */

const dimensionesHolland = [
  'Realista',
  'Investigador',
  'Artístico',
  'Social',
  'Emprendedor',
  'Convencional'
];

const preguntasHolland = {
  Realista: [
    { codigo: 'HOLLAND-R-001', texto__pregunta: '¿Prefieres trabajar con herramientas y máquinas?', tipo_pregunta: 'directa', peso: 'alta', dimensiones_secundarias: ['Investigador'], carreras_relacionadas: [], correlaciones_academicas: { asignaturas: ['Física', 'Matemáticas'], iaa_minimo: 14 }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-002', texto__pregunta: '¿Te gusta construir o reparar cosas con tus manos?', tipo_pregunta: 'directa', peso: 'alta', dimensiones_secundarias: [], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-003', texto__pregunta: '¿Prefieres trabajar al aire libre que en una oficina?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: [], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Al aire libre', 'En oficina', 'Indiferente'] },
    { codigo: 'HOLLAND-R-004', texto__pregunta: '¿Te sientes cómodo trabajando con equipos mecánicos?', tipo_pregunta: 'directa', peso: 'media', dimensiones_secundarias: ['Investigador'], carreras_relacionadas: [], correlaciones_academicas: { asignaturas: ['Física', 'Tecnología'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-005', texto__pregunta: 'Imagina que tienes que elegir entre diseñar un puente o escribir un artículo. ¿Cuál prefieres?', tipo_pregunta: 'proyectiva', peso: 'alta', dimensiones_secundarias: ['Artístico'], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Diseñar un puente', 'Escribir un artículo'] },
    { codigo: 'HOLLAND-R-006', texto__pregunta: '¿Te interesa más la aplicación práctica de conocimientos que la teoría abstracta?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Investigador'], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Aplicación práctica', 'Teoría abstracta', 'Ambas por igual'] },
    { codigo: 'HOLLAND-R-007', texto__pregunta: '¿Prefieres actividades que requieren destreza manual?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: [], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-008', texto__pregunta: '¿Te gustaría trabajar en construcción, agricultura o ingeniería de campo?', tipo_pregunta: 'situacional', peso: 'alta', dimensiones_secundarias: [], carreras_relacionadas: [], correlaciones_academicas: {}, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-009', texto__pregunta: '¿Prefieres resolver problemas técnicos que problemas interpersonales?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Social'], carreras_relacionadas: [], opciones_respuesta: ['Problemas técnicos', 'Problemas interpersonales', 'Ambos'] },
    { codigo: 'HOLLAND-R-010', texto__pregunta: '¿Te sientes más cómodo trabajando con objetos que con personas?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Social'], carreras_relacionadas: [], opciones_respuesta: ['Con objetos', 'Con personas', 'Ambos por igual'] },
    { codigo: 'HOLLAND-R-011', texto__pregunta: '¿Te gusta la carpintería, mecánica o electricidad?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: [], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-R-012', texto__pregunta: '¿Prefieres trabajos que requieren fuerza física y resistencia?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: [], opciones_respuesta: ['Sí', 'No'] }
  ],
  Investigador: [
    { codigo: 'HOLLAND-I-001', texto__pregunta: '¿Te apasiona descubrir el origen lógico de un problema complejo?', tipo_pregunta: 'proyectiva', peso: 'alta', dimensiones_secundarias: ['Realista', 'Convencional'], correlaciones_academicas: { asignaturas: ['Matemáticas', 'Física', 'Química'], iaa_minimo: 15 }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-002', texto__pregunta: '¿Prefieres investigar y analizar datos que trabajar directamente con personas?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Social'], correlaciones_academicas: { asignaturas: ['Matemáticas', 'Estadística'] }, opciones_respuesta: ['Investigar y analizar', 'Trabajar con personas', 'Ambos'] },
    { codigo: 'HOLLAND-I-003', texto__pregunta: '¿Te gusta leer artículos científicos o técnicos?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-004', texto__pregunta: '¿Te sientes motivado por resolver problemas abstractos y complejos?', tipo_pregunta: 'directa', peso: 'alta', correlaciones_academicas: { asignaturas: ['Matemáticas', 'Lógica'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-005', texto__pregunta: '¿Prefieres trabajar en un laboratorio que en una oficina comercial?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Emprendedor'], opciones_respuesta: ['Laboratorio', 'Oficina comercial', 'Indiferente'] },
    { codigo: 'HOLLAND-I-006', texto__pregunta: '¿Te interesa más entender cómo funcionan las cosas que usarlas?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Realista'], opciones_respuesta: ['Entender cómo funcionan', 'Usarlas', 'Ambos'] },
    { codigo: 'HOLLAND-I-007', texto__pregunta: '¿Disfrutas realizando experimentos y pruebas científicas?', tipo_pregunta: 'directa', peso: 'media', correlaciones_academicas: { asignaturas: ['Química', 'Biología', 'Física'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-008', texto__pregunta: '¿Te gustaría dedicarte a la investigación científica?', tipo_pregunta: 'situacional', peso: 'alta', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-009', texto__pregunta: '¿Prefieres trabajar de forma independiente que en equipo?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Social'], opciones_respuesta: ['Independiente', 'En equipo', 'Ambos'] },
    { codigo: 'HOLLAND-I-010', texto__pregunta: '¿Te sientes atraído por carreras como matemáticas, física, química o biología?', tipo_pregunta: 'directa', peso: 'baja', correlaciones_academicas: { asignaturas: ['Matemáticas', 'Física', 'Química', 'Biología'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-011', texto__pregunta: '¿Te gusta analizar datos y encontrar patrones?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: ['Convencional'], correlaciones_academicas: { asignaturas: ['Estadística', 'Matemáticas'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-I-012', texto__pregunta: '¿Prefieres la precisión y el rigor científico que la creatividad artística?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Artístico'], opciones_respuesta: ['Precisión científica', 'Creatividad artística', 'Ambas'] }
  ],
  Artístico: [
    { codigo: 'HOLLAND-A-001', texto__pregunta: '¿Te gusta expresarte a través del arte, la música o la escritura?', tipo_pregunta: 'directa', peso: 'alta', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-002', texto__pregunta: '¿Prefieres crear algo nuevo que seguir procedimientos establecidos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Convencional'], opciones_respuesta: ['Crear algo nuevo', 'Seguir procedimientos', 'Ambos'] },
    { codigo: 'HOLLAND-A-003', texto__pregunta: '¿Te sientes más cómodo en ambientes creativos y no estructurados?', tipo_pregunta: 'directa', peso: 'media', dimensiones_secundarias: ['Convencional'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-004', texto__pregunta: '¿Te gusta dibujar, pintar, tocar un instrumento o escribir?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-005', texto__pregunta: 'Imagina que puedes elegir entre diseñar un logo o resolver una ecuación. ¿Cuál prefieres?', tipo_pregunta: 'proyectiva', peso: 'alta', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Diseñar un logo', 'Resolver una ecuación'] },
    { codigo: 'HOLLAND-A-006', texto__pregunta: '¿Prefieres trabajos que permiten expresar tu creatividad?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-007', texto__pregunta: '¿Te interesa más la estética y el diseño que la funcionalidad técnica?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Realista'], opciones_respuesta: ['Estética y diseño', 'Funcionalidad técnica', 'Ambas'] },
    { codigo: 'HOLLAND-A-008', texto__pregunta: '¿Te gustaría trabajar en diseño gráfico, arquitectura o artes visuales?', tipo_pregunta: 'situacional', peso: 'alta', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-009', texto__pregunta: '¿Prefieres ambientes donde puedes ser original y único?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-010', texto__pregunta: '¿Te sientes más motivado por proyectos creativos que por proyectos analíticos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Proyectos creativos', 'Proyectos analíticos', 'Ambos'] },
    { codigo: 'HOLLAND-A-011', texto__pregunta: '¿Te gusta visitar museos, galerías de arte o conciertos?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-A-012', texto__pregunta: '¿Prefieres trabajar en proyectos que requieren imaginación e innovación?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] }
  ],
  Social: [
    { codigo: 'HOLLAND-S-001', texto__pregunta: '¿Te gusta ayudar a otras personas a resolver sus problemas?', tipo_pregunta: 'directa', peso: 'alta', correlaciones_academicas: { asignaturas: ['Psicología', 'Sociología', 'Humanidades'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-002', texto__pregunta: '¿Prefieres trabajar con personas que con objetos o datos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Realista', 'Investigador'], opciones_respuesta: ['Con personas', 'Con objetos/datos', 'Ambos'] },
    { codigo: 'HOLLAND-S-003', texto__pregunta: '¿Te sientes cómodo enseñando o explicando cosas a otros?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-004', texto__pregunta: '¿Te interesa más entender a las personas que entender sistemas técnicos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Entender personas', 'Entender sistemas técnicos', 'Ambos'] },
    { codigo: 'HOLLAND-S-005', texto__pregunta: '¿Te gustaría trabajar en educación, salud mental o servicios sociales?', tipo_pregunta: 'situacional', peso: 'alta', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-006', texto__pregunta: '¿Prefieres trabajar en equipo que de forma independiente?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['En equipo', 'Independiente', 'Ambos'] },
    { codigo: 'HOLLAND-S-007', texto__pregunta: '¿Te sientes motivado por mejorar la vida de otras personas?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-008', texto__pregunta: '¿Te gusta participar en actividades de voluntariado o servicio comunitario?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-009', texto__pregunta: '¿Prefieres carreras como psicología, trabajo social, educación o medicina?', tipo_pregunta: 'situacional', peso: 'media', correlaciones_academicas: { asignaturas: ['Psicología', 'Sociología', 'Humanidades'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-010', texto__pregunta: '¿Te sientes más cómodo en ambientes colaborativos que competitivos?', tipo_pregunta: 'comparativa', peso: 'media', dimensiones_secundarias: ['Emprendedor'], opciones_respuesta: ['Colaborativos', 'Competitivos', 'Ambos'] },
    { codigo: 'HOLLAND-S-011', texto__pregunta: '¿Te gusta escuchar y aconsejar a otras personas?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-S-012', texto__pregunta: '¿Prefieres trabajos que requieren empatía y habilidades interpersonales?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] }
  ],
  Emprendedor: [
    { codigo: 'HOLLAND-E-001', texto__pregunta: '¿Te gusta liderar proyectos y tomar decisiones importantes?', tipo_pregunta: 'directa', peso: 'alta', dimensiones_secundarias: ['Social'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-002', texto__pregunta: '¿Prefieres vender o persuadir que investigar o analizar?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Vender o persuadir', 'Investigar o analizar', 'Ambos'] },
    { codigo: 'HOLLAND-E-003', texto__pregunta: '¿Te sientes motivado por alcanzar metas y objetivos ambiciosos?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-004', texto__pregunta: '¿Te gustaría tener tu propio negocio o empresa?', tipo_pregunta: 'situacional', peso: 'alta', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-005', texto__pregunta: '¿Prefieres ambientes dinámicos y competitivos que tranquilos y estables?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Convencional'], opciones_respuesta: ['Dinámicos y competitivos', 'Tranquilos y estables', 'Ambos'] },
    { codigo: 'HOLLAND-E-006', texto__pregunta: '¿Te gusta negociar y cerrar acuerdos?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-007', texto__pregunta: '¿Te sientes cómodo asumiendo riesgos para obtener mayores beneficios?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-008', texto__pregunta: '¿Prefieres carreras como administración, negocios, marketing o derecho?', tipo_pregunta: 'situacional', peso: 'media', correlaciones_academicas: { asignaturas: ['Economía', 'Administración'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-009', texto__pregunta: '¿Te gusta influir en las decisiones de otros?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: ['Social'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-010', texto__pregunta: '¿Prefieres trabajos que requieren iniciativa y proactividad?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-E-011', texto__pregunta: '¿Te sientes más motivado por el éxito financiero que por la estabilidad?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Convencional'], opciones_respuesta: ['Éxito financiero', 'Estabilidad', 'Ambos'] },
    { codigo: 'HOLLAND-E-012', texto__pregunta: '¿Te gusta participar en competencias o desafíos empresariales?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] }
  ],
  Convencional: [
    { codigo: 'HOLLAND-C-001', texto__pregunta: '¿Prefieres seguir procedimientos establecidos que crear nuevos métodos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Artístico', 'Emprendedor'], opciones_respuesta: ['Seguir procedimientos', 'Crear nuevos métodos', 'Ambos'] },
    { codigo: 'HOLLAND-C-002', texto__pregunta: '¿Te gusta trabajar con datos organizados y sistemas estructurados?', tipo_pregunta: 'directa', peso: 'alta', dimensiones_secundarias: ['Investigador'], correlaciones_academicas: { asignaturas: ['Contabilidad', 'Estadística'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-003', texto__pregunta: '¿Te sientes cómodo en ambientes ordenados y predecibles?', tipo_pregunta: 'directa', peso: 'media', dimensiones_secundarias: ['Artístico'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-004', texto__pregunta: '¿Prefieres trabajos que requieren precisión y atención al detalle?', tipo_pregunta: 'directa', peso: 'media', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-005', texto__pregunta: '¿Te gusta organizar información y mantener registros?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-006', texto__pregunta: '¿Prefieres carreras como contabilidad, administración de empresas o secretariado?', tipo_pregunta: 'situacional', peso: 'media', correlaciones_academicas: { asignaturas: ['Contabilidad', 'Administración'] }, opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-007', texto__pregunta: '¿Te sientes más cómodo con tareas rutinarias que con proyectos creativos?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Artístico'], opciones_respuesta: ['Tareas rutinarias', 'Proyectos creativos', 'Ambos'] },
    { codigo: 'HOLLAND-C-008', texto__pregunta: '¿Te gusta trabajar con hojas de cálculo, bases de datos o sistemas de archivo?', tipo_pregunta: 'directa', peso: 'baja', dimensiones_secundarias: ['Investigador'], opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-009', texto__pregunta: '¿Prefieres estabilidad laboral que oportunidades de crecimiento rápido?', tipo_pregunta: 'comparativa', peso: 'alta', dimensiones_secundarias: ['Emprendedor'], opciones_respuesta: ['Estabilidad', 'Crecimiento rápido', 'Ambos'] },
    { codigo: 'HOLLAND-C-010', texto__pregunta: '¿Te sientes motivado por la precisión y el orden?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-011', texto__pregunta: '¿Te gusta trabajar en oficinas con horarios fijos?', tipo_pregunta: 'directa', peso: 'baja', opciones_respuesta: ['Sí', 'No'] },
    { codigo: 'HOLLAND-C-012', texto__pregunta: '¿Prefieres trabajos que requieren organización y planificación detallada?', tipo_pregunta: 'directa', peso: 'media', opciones_respuesta: ['Sí', 'No'] }
  ]
};

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🌱 Iniciando seeder de preguntas Holland RIASEC...');

    const todasLasPreguntas = [];

    for (const dimension of dimensionesHolland) {
      const preguntas = preguntasHolland[dimension] || [];

      preguntas.forEach(p => {
        todasLasPreguntas.push({
          id: Sequelize.literal('gen_random_uuid()'),
          codigo_pregunta: p.codigo,
          tipo_test: 'Holland_RIASEC',
          dimension_principal: dimension,
          dimension_secundaria: JSON.stringify(p.dimensiones_secundarias || []),
          texto__pregunta: p.texto__pregunta, // Ajustado a tu migración
          tipo_pregunta: p.tipo_pregunta || 'directa',
          peso_pregunta: p.peso || 'media', // Ajustado a tu migración
          carreras_relacionadas: JSON.stringify(p.carreras_relacionadas || []),
          correlaciones_academicas: JSON.stringify(p.correlaciones_academicas || {}),
          instrucciones_respuesta: JSON.stringify(p.opciones_respuesta || []),
          efectividad_historica: 0.50,
          veces_usada: 0,
          veces_efectiva: 0,
          activa: true,
          version: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
    }

    try {
      // Limpiamos antes de insertar
      await queryInterface.bulkDelete('preguntas_orientacion', { tipo_test: 'Holland_RIASEC' }, {});
      
      // Inserción directa
      await queryInterface.bulkInsert('preguntas_orientacion', todasLasPreguntas);
      
      console.log(`✅ ¡Éxito! Se insertaron ${todasLasPreguntas.length} preguntas.`);
    } catch (error) {
      console.error('❌ Error fatal en el seeder:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('preguntas_orientacion', { tipo_test: 'Holland_RIASEC' }, {});
  }
};