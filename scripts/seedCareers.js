// scripts/seedCareers.js
const { Career, sequelize } = require("../src/models");

const careers = [
  // Facultad de Ingeniería
  { name: "Ingeniería Civil", faculty: "Facultad de Ingeniería", description: "Atiende las necesidades y requerimientos del sistema productivo de un país." },
  { name: "Ingeniería Mecánica", faculty: "Facultad de Ingeniería", description: "Todo lo concerniente a máquinas y plantas industriales." },
  { name: "Ingeniería Producción", faculty: "Facultad de Ingeniería", description: "Organiza, planifica, mejora y controla los procesos de producción de servicios." },
  { name: "Ingeniería Química", faculty: "Facultad de Ingeniería", description: "Transforma materiales en productos útiles que incrementen el bienestar." },
  { name: "Ingeniería de Sistemas", faculty: "Facultad de Ingeniería", description: "Resuelve las dificultades mediante el uso del enfoque de sistemas." },
  { name: "Ingeniería Eléctrica", faculty: "Facultad de Ingeniería", description: "Diseña, construye, evalua y mantén intalaciones y equipos eléctricos." },

  // Facultad de Ciencias Económicas y Sociales
  { name: "Ciencias Administrativas", faculty: "Facultad de Ciencias Económicas y Sociales", description: "Ofrecemos mención Gerencia y Banca y Finanzas." },
  { name: "Economía Empresarial", faculty: "Facultad de Ciencias Económicas y Sociales", description: "Resuelve problemas económicos en las diversas instancias laborales." },
  { name: "Contaduría Pública", faculty: "Facultad de Ciencias Económicas y Sociales", description: "Comprende gerencial y estrategicamente para la optimización de procesos." },

  // Facultad de Ciencias
  { name: "Psicología", faculty: "Facultad de Ciencias", description: "Comprensión la conducta en una amplia variedad de modalidades, contextos y situaciones." },
  { name: "Matemáticas Industriales", faculty: "Facultad de Ciencias", description: "Ámbito académico, financieros, tecnológico e interactua en equipos multidisciplinarios." },

  // Facultad de Humanidades
  { name: "Educación", faculty: "Facultad de Humanidades", description: "Ejerce la docencia, la investigación, la promoción cultural, el desarrollo social-comunitario y la administración de la educación." },
  { name: "Idiomas Modernos", faculty: "Facultad de Humanidades", description: "Formación académica multidisciplinaria en comunicación interlingual e intercultural, en inglés y lengua materna." },
  { name: "Comunicación Social y Empresarial", faculty: "Facultad de Humanidades", description: "Programa que fusiona competencias tradicionales del comunicador con el dominio de tecnologías emergentes." },
  { name: "Turismo Sostenible", faculty: "Facultad de Humanidades", description: "Formación para liderar en Venezuela o el mundo y generar cambios positivos." },

  // Facultad de Estudios Jurídicos y Políticos
  { name: "Estudios Liberales", faculty: "Facultad de Estudios Jurídicos y Políticos", description: "Programa interdisciplinario en Filosofía y Ética, Política, Economía e Historia." },
  { name: "Derecho", faculty: "Facultad de Estudios Jurídicos y Políticos", description: "Garantizar la paz, la seguridad y los derechos de los ciudadanos, y regular las acciones del poder público." },
  { name: "Estudios Internacionales", faculty: "Facultad de Estudios Jurídicos y Políticos", description: "Combina Relaciones Internacionales, Política, Derecho Internacional, Economía y Estudios Globales." },
];

async function run() {
  try {
    // Asegura conexión
    await sequelize.authenticate();

    // Upsert simple por (name + faculty)
    for (const c of careers) {
      await Career.upsert({
        ...c,
        is_active: true,
      }, {
        // En Sequelize, upsert usa PK/unique. Si no tienes unique, igual funciona si el dialect lo soporta,
        // pero lo ideal es crear un índice UNIQUE abajo (ver paso 2).
      });
    }

    console.log(`✅ Seed completado. Insertadas/actualizadas: ${careers.length}`);
  } catch (err) {
    console.error("❌ Error en seed:", err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();