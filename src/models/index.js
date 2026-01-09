// Importación compatible con diferentes versiones de Sequelize v6
const sequelizePackage = require('sequelize');
const Sequelize = sequelizePackage.Sequelize || sequelizePackage;
const { DataTypes } = sequelizePackage;

const config = require('../config/config');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const envConfig = dbConfig[env];

const sequelize = new Sequelize(
  envConfig.database,
  envConfig.username,
  envConfig.password,
  envConfig
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import all models with Spanish naming - Sistema de Gestión de Becas UNIMET
// IMPORTANTE: Documento debe cargarse ANTES que Usuario porque Usuario tiene FKs a Documento
db.Documento = require('./Documento')(sequelize, DataTypes);
db.Usuario = require('./Usuario')(sequelize, DataTypes);
db.ProgramaBeca = require('./ProgramaBeca')(sequelize, DataTypes);
db.Postulacion = require('./Postulacion')(sequelize, DataTypes);
db.EstudianteBecario = require('./EstudianteBecario')(sequelize, DataTypes);
db.Plaza = require('./Plaza')(sequelize, DataTypes);
db.PostulacionPlaza = require('./PostulacionPlaza')(sequelize, DataTypes);
db.ReporteActividad = require('./ReporteActividad')(sequelize, DataTypes);
db.DisponibilidadHoraria = require('./DisponibilidadHoraria')(sequelize, DataTypes);
db.ConfiguracionPeriodo = require('./ConfiguracionPeriodo')(sequelize, DataTypes);
db.ConfiguracionBeca = require('./ConfiguracionBeca')(sequelize, DataTypes);
db.Auditoria = require('./Auditoria')(sequelize, DataTypes);
db.Career = require('./Career')(sequelize, DataTypes);


db.PreguntaOrientacion = require('./PreguntaOrientacion')(sequelize, DataTypes);
db.SesionTestOrientacion = require('./SesionTestOrientacion')(sequelize, DataTypes);
db.TrayectoriaAcademica = require('./TrayectoriaAcademica')(sequelize, DataTypes);
db.RespuestaTestOrientacion = require('./RespuestaTestOrientacion')(sequelize, DataTypes);
db.ResultadoOrientacion = require('./ResultadoOrientacion')(sequelize, DataTypes);

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
