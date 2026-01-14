'use strict';

   module.exports = {
     async up(queryInterface, Sequelize) {
       // Extender ENUM de roles
       await queryInterface.sequelize.query(`
         ALTER TYPE "enum_usuarios_role" ADD VALUE IF NOT EXISTS 'aspirante';
         ALTER TYPE "enum_usuarios_role" ADD VALUE IF NOT EXISTS 'especialista';
       `);
     },

     async down(queryInterface, Sequelize) {
       // Nota: No se puede eliminar valores de ENUM en PostgreSQL fácilmente
       // Requiere recrear el ENUM
       // Por ahora, solo documentamos que estos roles no se usarán
       console.log('No se puede revertir la extensión del ENUM de roles');
     }
   };
