// scripts/seedCareers.js
const { Career, sequelize } = require("../src/models");

const careers = [
  // =========================
  // FACULTAD DE INGENIERÍA
  // =========================
  {
    code: "ING_CIV",
    name: "Ingeniería Civil",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Atiende las necesidades y requerimientos del sistema productivo de un país, vinculadas al desarrollo de infraestructuras, obras hidráulicas y de transporte de gran tamaño y de uso público.",
    profile:
      "Dirigida a estudiantes inclinados hacia la física, química y geología; conocida como la ingeniería de la civilización.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ING_MEC",
    name: "Ingeniería Mecánica",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Carrera orientada al uso de principios físicos para el análisis, diseño, fabricación y mantenimiento de sistemas mecánicos, ideal para quienes desean crear dispositivos útiles.",
    profile:
      "Requiere habilidades cuantitativas y verbales, abstracción espacial, creatividad, actitud emprendedora y sensibilidad social y ambiental.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ING_PROD",
    name: "Ingeniería de Producción",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Se dedica a la organización, planificación, mejoramiento continuo y control de procesos de producción de bienes y servicios, optimizando recursos materiales, humanos y tecnológicos.",
    profile: "Dirigida a estudiantes interesados en la optimización de procesos productivos y de servicios, la gestión eficiente de recursos y la mejora continua en organizaciones. Requiere afinidad por el razonamiento lógico, analítico y cuantitativo, así como interés por la planificación, organización y toma de decisiones. El egresado está capacitado para diseñar, analizar y mejorar sistemas de producción, integrando factores técnicos, humanos y económicos para aumentar la productividad y competitividad de las empresas.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ING_QUIM",
    name: "Ingeniería Química",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Orientada a estudiantes con vocación científica aplicada a la búsqueda de soluciones a problemas tecnológicos que mejoren prácticas actuales.",
    profile:
      "Interesados en completar una formación profesional sólida, con razonamiento lógico y analítico.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ING_SIS",
    name: "Ingeniería de Sistemas",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Capacita para estudiar problemas interdisciplinarios relacionados con el manejo de información dentro de una organización, resolviendo dificultades mediante enfoque de sistemas y herramientas tecnológicas.",
    profile:
      "Dirigida a estudiantes con vocación científica, interesados en resolver problemas con tecnologías de computación/informática/comunicación; con razonamiento lógico y analítico.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ING_ELEC",
    name: "Ingeniería Eléctrica",
    faculty: "Facultad de Ingeniería",
    area: "Ingeniería",
    description:
      "Permite desempeñar funciones de diseño, construcción, evaluación y mantenimiento de instalaciones y equipos eléctricos/electrónicos/telecomunicaciones; así como sistemas de potencia y automatización.",
    profile: "Orientada a estudiantes interesados en sistemas eléctricos y tecnológicos, con habilidades analíticas, afinidad por las matemáticas y la física, y vocación por la innovación y el desarrollo industrial.",
    duration: "4",
    modality: "Presencial",
  },

  // =========================================
  // FACULTAD DE CIENCIAS ECONÓMICAS Y SOCIALES
  // =========================================
  {
    code: "CS_ADM",
    name: "Ciencias Administrativas",
    faculty: "Facultad de Ciencias Económicas y Sociales",
    area: "Economía y Finanzas",
    description:
      "Diseñada para responder a altas exigencias personales y profesionales mediante el desarrollo de destrezas y competencias gerenciales (con menciones como Gerencia y Banca y Finanzas según oferta).",
    profile: "Incluye enfoque práctico y de formación para liderazgo y toma de decisiones.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "ECO_EMP",
    name: "Economía Empresarial",
    faculty: "Facultad de Ciencias Económicas y Sociales",
    area: "Economía y Finanzas",
    description:
      "Aplica teorías y métodos de la ciencia económica moderna a la solución de problemas a los que se enfrentan las empresas.",
    profile: "Dirigida a estudiantes con interés en el análisis económico aplicado al entorno empresarial, la toma de decisiones estratégicas y la comprensión de los mercados. Requiere afinidad por el razonamiento lógico, cuantitativo y analítico, así como capacidad para interpretar información económica y financiera. El egresado está preparado para evaluar escenarios económicos, apoyar la gestión empresarial y participar en procesos de planificación, consultoría y análisis de negocios en contextos nacionales e internacionales.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "CONT_PUB",
    name: "Contaduría Pública",
    faculty: "Facultad de Ciencias Económicas y Sociales",
    area: "Economía y Finanzas",
    description:
      "Formación contable orientada a la comprensión y análisis de operaciones y entorno para apoyar la toma de decisiones y el funcionamiento organizacional.",
    profile:
      "Dirigida a estudiantes que se proyecten en la dirección de empresas, reconozcan el trabajo en equipo y tengan perfil proactivo, líder y emprendedor.",
    duration: "4",
    modality: "Presencial",
  },

  // =========================
  // FACULTAD DE CIENCIAS
  // =========================
  {
    code: "PSI",
    name: "Psicología",
    faculty: "Facultad de Ciencias",
    area: "Humanidades y Ciencias del Comportamiento",
    description:
      "Orientada a la comprensión de la conducta en múltiples modalidades, contextos y situaciones; enfocada en construcción del sí mismo y transformación del sujeto.",
    profile:
      "Busca formar psicólogos como actores sociales y líderes promotores del desarrollo humano.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "MAT_IND",
    name: "Matemáticas Industriales",
    faculty: "Facultad de Ciencias",
    area: "Matemáticas",
    description:
      "Programa orientado a explorar y aplicar herramientas matemáticas en contextos industriales y de información, promoviendo innovación y pensamiento analítico.",
    profile: "Orientada a estudiantes con interés en la aplicación de las matemáticas a problemas industriales y tecnológicos, con habilidades analíticas, abstractas y cuantitativas.",
    duration: "4",
    modality: "Presencial",
  },

  // =========================
  // FACULTAD DE HUMANIDADES
  // =========================
  {
    code: "COM_SOC_EMP",
    name: "Comunicación Social y Empresarial",
    faculty: "Facultad de Humanidades",
    area: "Humanidades",
    description:
      "Programa que redefine la comunicación en el siglo XXI, fusionando competencias tradicionales con dominio de tecnologías emergentes y enfoque en transformación digital.",
    profile: "Orientada a estudiantes interesados en la comunicación estratégica, la creación de contenidos y el análisis de medios, con habilidades expresivas, creatividad y pensamiento crítico.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "EDU",
    name: "Educación",
    faculty: "Facultad de Humanidades",
    area: "Humanidades",
    description:
      "Integra pedagogía, sociología, psicología y administración para formar docentes con herramientas para atender a la comunidad educativa y resolver problemas.",
    profile: "Dirigida a estudiantes interesados en la docencia, la gestión educativa y la investigación en contextos escolares y comunitarios, con habilidades para la comunicación, el trabajo en equipo y la resolución de conflictos.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "IDI_MOD",
    name: "Idiomas Modernos",
    faculty: "Facultad de Humanidades",
    area: "Humanidades",
    description:
      "Dirigida a estudiantes interesados en comunicación intercultural y aprendizaje de lenguas extranjeras, con perfil versátil para docencia, traducción, interpretación, empresa, doblaje y marketing digital.",
    profile: "Orientada a estudiantes con interés en la enseñanza de idiomas, la traducción y la interpretación, con habilidades comunicativas, culturales y pedagógicas, así como capacidad para adaptarse a contextos multiculturales y tecnológicos.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "TUR_SOS",
    name: "Turismo Sostenible",
    faculty: "Facultad de Humanidades",
    area: "Humanidades",
    description:
      "Carrera innovadora, práctica y alineada con realidades locales y globales; forma líderes en turismo y hospitalidad con visión gerencial y emprendedora para generar cambios positivos.",
    profile: "Orientada a estudiantes interesados en el turismo, la hospitalidad y la sostenibilidad, con vocación de servicio y enfoque en el desarrollo responsable.",
    duration: "4",
    modality: "Presencial",
  },

  // ==========================================
  // FACULTAD DE ESTUDIOS JURÍDICOS Y POLÍTICOS
  // ==========================================
  {
    code: "DER",
    name: "Derecho",
    faculty: "Facultad de Estudios Jurídicos y Políticos",
    area: "Estudios Jurídicos",
    description:
      "Formación orientada al abogado moderno, preparado para un mundo globalizado; con énfasis en negociar, razonar jurídicamente, argumentar, investigar y actuar profesionalmente.",
    profile: "Orientada a estudiantes interesados en el estudio del derecho y la justicia, con habilidades de análisis, argumentación y expresión, y vocación por el ejercicio ético de la profesión jurídica.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "EST_LIB",
    name: "Estudios Liberales",
    faculty: "Facultad de Estudios Jurídicos y Políticos",
    area: "Estudios Jurídicos",
    description:
      "Programa interdisciplinario con ejes de Filosofía y Ética, Política, Historia y Economía; incluye herramientas de informática, investigación social y electivas de formación general.",
    profile: "Dirigido a estudiantes interesados en una formación integral que abarca diversas disciplinas humanísticas y sociales, con habilidades para el análisis crítico, la reflexión ética y la comprensión de fenómenos sociales complejos.",
    duration: "4",
    modality: "Presencial",
  },
  {
    code: "EST_INT",
    name: "Estudios Internacionales",
    faculty: "Facultad de Estudios Jurídicos y Políticos",
    area: "Estudios Jurídicos",
    description:
      "Programa interdisciplinario que combina Relaciones Internacionales, Política, Derecho Internacional, Economía y Estudios Globales; orientado a comprender dinámicas globales y desafíos contemporáneos.",
    profile: "Orientada a estudiantes interesados en la política, la economía y las relaciones internacionales, con capacidad de análisis crítico y comprensión de contextos globales.",
    duration: "4",
    modality: "Presencial",
  },
];

async function run() {
  try {
    // Asegura conexión
    await sequelize.authenticate();

    // Idempotent upsert by (name + faculty) to match uq_careers_name_faculty
    await sequelize.transaction(async (t) => {
      for (const c of careers) {
        const where = { name: c.name, faculty: c.faculty };

        const existing = await Career.findOne({ where, transaction: t });

        if (existing) {
          await existing.update(
            {
              ...c,
              is_active: true,
            },
            { transaction: t }
          );
        } else {
          await Career.create(
            {
              ...c,
              is_active: true,
            },
            { transaction: t }
          );
        }
      }
    });

    console.log(`✅ Seed completado. Insertadas/actualizadas: ${careers.length}`);
  } catch (err) {
    console.error("❌ Error en seed:", err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();