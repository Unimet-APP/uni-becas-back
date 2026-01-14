require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const { sequelize } = require('./src/models');

const startServer = async () => {
  // Banner de inicio para identificar reinicios en logs
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('   🚀 INICIANDO SERVIDOR - NUEVO REINICIO');
  console.log('   📅 Timestamp:', new Date().toISOString());
  console.log('   🔧 Node Version:', process.version);
  console.log('   📁 Working Directory:', process.cwd());
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync database in development (update tables to match models)
    // Habilitado por defecto, puede deshabilitarse con DISABLE_SYNC=true si se cuelga
    if (config.server.env === 'development') {
      const shouldDisableSync = process.env.DISABLE_SYNC === 'true';

      try {
        if (shouldDisableSync) {
          logger.info('⚠️  Database sync DISABLED via DISABLE_SYNC=true');
          logger.info('ℹ️  Using existing database schema');
        } else {
          logger.info('🔄 Starting database sync (alter mode)...');
          // Excluir modelos de orientación vocacional del sync automático
          // Estos modelos deben ser gestionados solo mediante migraciones
          const orientacionModels = [
            'PreguntaOrientacion', 
            'SesionTestOrientacion', 
            'RespuestaTestOrientacion', 
            'ResultadoOrientacion', 
            'TrayectoriaAcademica'
          ];
          
          let syncedCount = 0;
          let skippedCount = 0;
          
          for (const modelName in sequelize.models) {
            if (orientacionModels.includes(modelName)) {
              skippedCount++;
              logger.debug(`⏭️  Skipping sync for ${modelName} (managed by migrations)`);
            } else {
              try {
                await sequelize.models[modelName].sync({ alter: true });
                syncedCount++;
              } catch (modelSyncError) {
                logger.warn(`⚠️  Failed to sync ${modelName}: ${modelSyncError.message}`);
              }
            }
          }
          
          logger.info(`✅ Database synchronized: ${syncedCount} models synced, ${skippedCount} skipped (migration-managed)`);
          if (skippedCount > 0) {
            logger.info('ℹ️  Modelos de orientación vocacional deben gestionarse mediante migraciones (npm run migrate)');
          }
        }

        // Run seeders to populate database with test data (only creates if not exists)
        // SEEDERS DESHABILITADOS - Descomentar si necesitas repoblar la base de datos
        // const { runSeeders } = require('./database/seeders');
        // await runSeeders();
        // logger.info('✅ Database seeded successfully with test data');
      } catch (syncError) {
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('   ❌ DATABASE SYNC FAILED - ERROR DETAILS:');
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('Error name:', syncError.name);
        console.log('Error message:', syncError.message);
        console.log('SQL Query:', syncError.sql || 'N/A');
        console.log('PostgreSQL Error:', syncError.original?.message || 'N/A');
        console.log('Error Code:', syncError.original?.code || 'N/A');
        console.log('Table:', syncError.table || 'N/A');
        console.log('\nFull Stack Trace:');
        console.log(syncError.stack);
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        console.log('\n');

        logger.error('Database sync failed:', {
          name: syncError.name,
          message: syncError.message,
          sql: syncError.sql,
          originalError: syncError.original?.message,
          code: syncError.original?.code,
          table: syncError.table
        });

        throw syncError;
      }
    }

    // Start the server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on ${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`API Documentation: http://${config.server.host}:${config.server.port}/api`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          return process.exit(1);
        }
        
        try {
          // Close database connection
          await sequelize.close();
          logger.info('Database connection closed');
          
          logger.info('Server shutdown completed');
          process.exit(0);
        } catch (dbErr) {
          logger.error('Error closing database connection:', dbErr);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();