const { ProgramaBeca } = require('../../src/models');

const programasData = [
  {
    nombre: 'Beca Ayudantía',
    descripcion: 'Programa de becas para estudiantes que realizan actividades de apoyo académico, administrativo o de investigación.',
    porcentaje_descuento: 25.00,
    requisitos: {
      iaa_minimo_pregrado: 12.0,
      iaa_minimo_postgrado: 14.0,
      creditos_minimos: 3,
      estudiante_activo: true,
      sin_sanciones: true,
      solvente_o_plan_pago: true
    },
    horas_requeridas_regular: 120,
    horas_requeridas_intensivo: 60,
    limite_horas_semanales_regular: 10,
    limite_horas_semanales_intensivo: 5
  },
  {
    nombre: 'Beca Impacto',
    descripcion: 'Programa de becas para estudiantes destacados por su impacto en la comunidad universitaria.',
    porcentaje_descuento: 50.00,
    requisitos: {
      iaa_minimo_pregrado: 15.0,
      iaa_minimo_postgrado: 16.0,
      creditos_minimos: 12,
      estudiante_activo: true,
      actividades_extracurriculares: true,
      liderazgo_comunitario: true
    },
    horas_requeridas_regular: 0,
    horas_requeridas_intensivo: 0,
    limite_horas_semanales_regular: 0,
    limite_horas_semanales_intensivo: 0
  },
  {
    nombre: 'Beca Excelencia',
    descripcion: 'Programa de becas para estudiantes con excelencia académica sostenida.',
    porcentaje_descuento: 75.00,
    requisitos: {
      iaa_minimo_pregrado: 17.0,
      iaa_minimo_postgrado: 18.0,
      creditos_minimos: 15,
      estudiante_activo: true,
      historial_academico_destacado: true,
      sin_materias_reprobadas: true
    },
    horas_requeridas_regular: 0,
    horas_requeridas_intensivo: 0,
    limite_horas_semanales_regular: 0,
    limite_horas_semanales_intensivo: 0
  },
  {
    nombre: 'Exoneración de Pago - Personal e Hijos',
    descripcion: 'Programa de exoneración de matrícula para personal de la universidad y sus hijos.',
    porcentaje_descuento: 100.00,
    requisitos: {
      empleado_unimet: true,
      hijo_empleado_unimet: true,
      estudiante_activo: true,
      cumplir_reglamento_interno: true
    },
    horas_requeridas_regular: 0,
    horas_requeridas_intensivo: 0,
    limite_horas_semanales_regular: 0,
    limite_horas_semanales_intensivo: 0
  }
];

module.exports = async () => {
  for (const programaData of programasData) {
    await ProgramaBeca.findOrCreate({
      where: { nombre: programaData.nombre },
      defaults: programaData
    });
  }
};