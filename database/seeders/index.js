const { sequelize } = require('../../src/models');
const seedRoles = require('./001-roles');
const seedProgramasBecas = require('./002-programas-becas');
const seedUsuarios = require('./003-usuarios');
const seedPostulaciones = require('./004-postulaciones-ejemplo');
const seedConfiguracionesBecas = require('./005-configuraciones-becas');

const runSeeders = async () => {
  try {
    console.log('🌱 Iniciando seeders...');

    // Seeders de roles y programas deshabilitados - no hay modelos para estos
    // await seedRoles();
    // console.log('✅ Roles creados');

    // await seedProgramasBecas();
    // console.log('✅ Programas de becas creados');

    await seedUsuarios();
    console.log('✅ Usuarios de prueba creados');

    // Seeder de postulaciones deshabilitado temporalmente
    // await seedPostulaciones();
    // console.log('✅ Postulaciones de ejemplo creadas');

    // Seeder de configuraciones de becas
    await seedConfiguracionesBecas();

    console.log('🎉 Seeders completados exitosamente');
  } catch (error) {
    console.error('❌ Error en seeders:', error);
    throw error;
  }
};

module.exports = { runSeeders };