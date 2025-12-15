const { Role } = require('../../src/models');

const rolesData = [
  {
    nombre: 'Estudiante',
    descripcion: 'Rol para estudiantes que pueden postularse a becas',
    permisos: {
      postulaciones: ['create', 'read_own', 'update_own'],
      documentos: ['upload', 'download_own', 'delete_own'],
      horas: ['register', 'read_own'],
      perfil: ['read_own', 'update_own']
    }
  },
  {
    nombre: 'Supervisor',
    descripcion: 'Rol para supervisores que evalúan a los ayudantes',
    permisos: {
      ayudantias: ['read_assigned', 'evaluate'],
      horas: ['approve', 'reject', 'read_assigned'],
      evaluaciones: ['create', 'read_own', 'update_own'],
      estudiantes: ['read_assigned'],
      perfil: ['read_own', 'update_own']
    }
  },
  {
    nombre: 'Gestor de Becas',
    descripcion: 'Rol para gestores que administran todo el sistema de becas',
    permisos: {
      postulaciones: ['create', 'read', 'update', 'delete', 'approve', 'reject'],
      ayudantias: ['create', 'read', 'update', 'delete', 'assign_supervisor'],
      usuarios: ['read', 'update', 'activate', 'deactivate'],
      reportes: ['generate', 'export'],
      documentos: ['read', 'verify', 'reject'],
      auditoria: ['read'],
      programas: ['read', 'update', 'create'],
      perfil: ['read_own', 'update_own']
    }
  }
];

module.exports = async () => {
  for (const roleData of rolesData) {
    await Role.findOrCreate({
      where: { nombre: roleData.nombre },
      defaults: roleData
    });
  }
};