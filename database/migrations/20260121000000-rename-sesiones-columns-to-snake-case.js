'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Renombrar columnas de camelCase a snake_case en sesiones_test_orientacion
    try {
      // Verificar si la columna usuarioId existe
      const tableInfo = await queryInterface.describeTable('sesiones_test_orientacion');
      
      // Renombrar usuarioId a usuario_id si existe
      if (tableInfo.usuarioId) {
        await queryInterface.renameColumn('sesiones_test_orientacion', 'usuarioId', 'usuario_id');
        console.log('✅ Columna usuarioId renombrada a usuario_id');
      } else if (tableInfo.usuarioid) {
        // Si está en minúsculas, también renombrarla
        await queryInterface.renameColumn('sesiones_test_orientacion', 'usuarioid', 'usuario_id');
        console.log('✅ Columna usuarioid renombrada a usuario_id');
      }

      // Renombrar tipoTest a tipo_test si existe
      if (tableInfo.tipoTest) {
        await queryInterface.renameColumn('sesiones_test_orientacion', 'tipoTest', 'tipo_test');
        console.log('✅ Columna tipoTest renombrada a tipo_test');
      } else if (tableInfo.tipotest) {
        // Si está en minúsculas, también renombrarla
        await queryInterface.renameColumn('sesiones_test_orientacion', 'tipotest', 'tipo_test');
        console.log('✅ Columna tipotest renombrada a tipo_test');
      }

      // Actualizar índices si existen
      try {
        await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_test_orientacion_usuario');
      } catch (e) {
        // El índice puede no existir o tener otro nombre
        console.log('⚠️ No se pudo eliminar índice anterior (puede no existir)');
      }

      // Crear nuevo índice con el nombre correcto
      await queryInterface.addIndex('sesiones_test_orientacion', ['usuario_id', 'estado'], {
        name: 'idx_sesiones_test_orientacion_usuario',
      });

    } catch (error) {
      console.error('❌ Error al renombrar columnas:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Revertir: renombrar de snake_case a camelCase
    try {
      const tableInfo = await queryInterface.describeTable('sesiones_test_orientacion');
      
      if (tableInfo.usuario_id) {
        await queryInterface.renameColumn('sesiones_test_orientacion', 'usuario_id', 'usuarioId');
        console.log('✅ Columna usuario_id renombrada a usuarioId');
      }

      if (tableInfo.tipo_test) {
        await queryInterface.renameColumn('sesiones_test_orientacion', 'tipo_test', 'tipoTest');
        console.log('✅ Columna tipo_test renombrada a tipoTest');
      }

      // Restaurar índice original
      try {
        await queryInterface.removeIndex('sesiones_test_orientacion', 'idx_sesiones_test_orientacion_usuario');
      } catch (e) {
        console.log('⚠️ No se pudo eliminar índice');
      }

      await queryInterface.addIndex('sesiones_test_orientacion', ['usuarioId', 'estado'], {
        name: 'idx_sesiones_test_orientacion_usuario',
      });

    } catch (error) {
      console.error('❌ Error al revertir renombrado:', error.message);
      throw error;
    }
  }
};
