const { Postulacion, User, ProgramaBeca, Ayudantia } = require('../../src/models');

module.exports = async () => {
  // Get users and programs
  const estudiantes = await User.findAll({ where: { tipo_usuario: 'estudiante' } });
  const supervisores = await User.findAll({ where: { tipo_usuario: 'supervisor' } });
  const gestores = await User.findAll({ where: { tipo_usuario: 'gestor_becas' } });
  const programaAyudantia = await ProgramaBeca.findOne({ where: { nombre: 'Beca Ayudantía' } });
  const programaImpacto = await ProgramaBeca.findOne({ where: { nombre: 'Beca Impacto' } });

  if (!estudiantes.length || !programaAyudantia) {
    console.log('Skipping postulaciones seeder - required data not found');
    return;
  }

  const postulacionesData = [
    // Postulación aprobada con ayudantía activa
    {
      usuario_id: estudiantes[0].id,
      programa_beca_id: programaAyudantia.id,
      periodo_academico: '2025-1',
      estado: 'aprobada',
      indice_academico: 15.5,
      creditos_inscritos: 18,
      tipo_periodo: 'regular',
      nivel_academico: 'pregrado',
      fecha_evaluacion: new Date(),
      evaluado_por: gestores.length ? gestores[0].id : null,
      observaciones: 'Cumple con todos los requisitos académicos. Excelente historial.'
    },
    
    // Postulación pendiente
    {
      usuario_id: estudiantes[1] ? estudiantes[1].id : estudiantes[0].id,
      programa_beca_id: programaAyudantia.id,
      periodo_academico: '2025-1',
      estado: 'pendiente',
      indice_academico: 13.2,
      creditos_inscritos: 15,
      tipo_periodo: 'regular',
      nivel_academico: 'pregrado',
      observaciones: null
    },
    
    // Postulación para Beca Impacto
    {
      usuario_id: estudiantes[2] ? estudiantes[2].id : estudiantes[0].id,
      programa_beca_id: programaImpacto ? programaImpacto.id : programaAyudantia.id,
      periodo_academico: '2025-1',
      estado: 'en_evaluacion',
      indice_academico: 16.8,
      creditos_inscritos: 20,
      tipo_periodo: 'regular',
      nivel_academico: 'pregrado',
      observaciones: null
    }
  ];

  const postulacionesCreadas = [];

  for (const postulacionData of postulacionesData) {
    const [postulacion] = await Postulacion.findOrCreate({
      where: {
        usuario_id: postulacionData.usuario_id,
        programa_beca_id: postulacionData.programa_beca_id,
        periodo_academico: postulacionData.periodo_academico
      },
      defaults: postulacionData
    });
    postulacionesCreadas.push(postulacion);
  }

  // Crear ayudantía para la postulación aprobada
  const postulacionAprobada = postulacionesCreadas[0];
  if (postulacionAprobada && postulacionAprobada.estado === 'aprobada' && supervisores.length) {
    await Ayudantia.findOrCreate({
      where: { postulacion_id: postulacionAprobada.id },
      defaults: {
        postulacion_id: postulacionAprobada.id,
        supervisor_id: supervisores[0].id,
        tipo_ayudantia: 'academica',
        plaza_asignada: 'Laboratorio de Física - Apoyo a estudiantes de primer año',
        fecha_inicio: new Date('2025-02-01'),
        fecha_fin: new Date('2025-05-31'),
        horas_requeridas: 120,
        horas_completadas: 0,
        estado: 'activa',
        observaciones: 'Ayudantía asignada para apoyo en laboratorio de física básica'
      }
    });
  }
};