'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('preguntas_orientacion',{
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      codigo_pregunta: {
        type: Sequelize.STRING(50),
        allowNull:false,
        comment: 'Código único para la pregunta',
      },
      tipo_test: {
        type: Sequelize.ENUM('Kuder', 'Holland_RIASEC','Personalizado'),
        allowNull:false,
        comment: 'Tipo de test al que pertenece la pregunta',
      },
      dimension_principal: {
        type: Sequelize.STRING(50),
        allowNull:false,
      },
      dimension_secundaria: {
        type: Sequelize.JSONB,
        allowNull:true,
        defaultValue: [],
        comment: 'Dimensiones secundarias de la pregunta',
      },
      texto__pregunta:{
        type: Sequelize.TEXT,
        allowNull:false,
        comment: 'Texto de la pregunta',
      },
      tipo_pregunta: {
        type: Sequelize.ENUM('directa','comparativa','situacional','proyectiva'),
        allowNull:false,
        defaultValue: 'directa',
        comment: 'Tipo de pregunta',
      },
      peso_pregunta:{
        type: Sequelize.ENUM('alta','media','baja'),
        allowNull:false,
        defaultValue: 'media',
        comment: 'Peso de la pregunta'
      },
      carreras_relacionadas: {
        type: Sequelize.JSONB,
        allowNull:true,
        defaultValue: [],
      },
      correlaciones_academicas: {
        type: Sequelize.JSONB,
        allowNull:true,
        defaultValue: [],
      },
      efectividad_historica:{
        type: Sequelize.DECIMAL(4,2),
        allowNull:true,
        defaultValue: 0.00,

      },
      veces_usada:{
        type: Sequelize.INTEGER,
        allowNull:false,
        defaultValue: 0,
      },
      veces_efectiva:{
        type: Sequelize.INTEGER,
        allowNull:false,
        defaultValue: 0,
      },
      activa:{
        type: Sequelize.BOOLEAN,
        allowNull:false,
        defaultValue: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull:false,
        defaultValue: 1,
      },
      instrucciones_pregunta: {
        type: Sequelize.TEXT,
        allowNull:true,
      },
      instrucciones_respuesta: {
        type: Sequelize.JSONB,
        allowNull:true,
        defaultValue: [],
        comment: 'Instrucciones de la respuesta',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    await queryInterface.addIndex('preguntas_orientacion', ['tipo_test'],['dimension_principal'], {
      unique: true,
      name: 'idx_preguntas_tipo_dimension',
    });
    await queryInterface.addIndex('preguntas_orientacion', ['activa','peso'], {
      name: 'idx_preguntas_activa_peso',
    });
    await queryInterface.addIndex('preguntas_orientacion', ['efectividad_historica'], {
      name: 'idx_preguntas_efectividad',
    });
    await queryInterface.addIndex('preguntas_orientacion', ['codigo_pregunta'], {
      name: 'idx_preguntas_codigo',
    });
    
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    const indices = [
      'idx_preguntas_tipo_dimension',
      'idx_preguntas_activa_peso',
      'idx_preguntas_efectividad',
      'idx_preguntas_codigo',
    ];
    
    for (const index of indices){
      try {
        await queryInterface.removeIndex('preguntas_orientacion', index);
      } catch (error) {
        console.error(`Error al eliminar índice ${index}:`, error);
      }
    }

    try {
      await queryInterface.dropTable('preguntas_orientacion');
    } catch (error) {
      console.error('Error al eliminar tabla preguntas_orientacion:', error);
      throw error;
    }
    
    const enums = ['tipo_test', 'tipo_pregunta', 'peso_pregunta'];
    for (const enumName of enums){    
      try {
        await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_preguntas_orientacion_${enumName}"`);
      } catch (error) {
        console.error(`Error al eliminar ENUM ${enumName}:`, error);
      }
    }

    console.log('✅ ENUMs eliminados');
    console.log('✅ Migración revertida');
    console.log('✅ Migración completada');
    console.log('✅ Migración revertida');
    
    
  }
};
