const { Usuario } = require('../../src/models');
const bcrypt = require('bcryptjs');

// NOTA: Contraseña uniforme para todos los usuarios de prueba: Unimet123!
const usuariosData = [
  // Estudiantes
  {
    nombre: 'Juan Carlos',
    apellido: 'Pérez García',
    email: 'juan.perez@correo.unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-12345678',
    telefono: '+58 416 1234567',
    role: 'estudiante'
  },
  {
    nombre: 'María Alejandra',
    apellido: 'González Rodríguez',
    email: 'maria.gonzalez@correo.unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-23456789',
    telefono: '+58 416 2345678',
    role: 'estudiante'
  },
  {
    nombre: 'Carlos Eduardo',
    apellido: 'Martínez López',
    email: 'carlos.martinez@correo.unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-34567890',
    telefono: '+58 416 3456789',
    role: 'estudiante'
  },

  // Supervisores
  {
    nombre: 'Dra. Ana Isabel',
    apellido: 'García Mendoza',
    email: 'prof.garcia@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-87654321',
    telefono: '+58 424 1234567',
    role: 'supervisor'
  },
  {
    nombre: 'Ing. Roberto',
    apellido: 'Silva Contreras',
    email: 'prof.silva@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-76543210',
    telefono: '+58 424 2345678',
    role: 'supervisor'
  },
  {
    nombre: 'Lic. Carmen Rosa',
    apellido: 'Herrera Díaz',
    email: 'prof.herrera@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-65432109',
    telefono: '+58 424 3456789',
    role: 'supervisor'
  },

  // Gestores de Becas (admin)
  {
    nombre: 'Carlos Antonio',
    apellido: 'Rodríguez Morales',
    email: 'admin.becas@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-11111111',
    telefono: '+58 426 1234567',
    role: 'admin'
  },
  {
    nombre: 'Licda. Patricia',
    apellido: 'Fernández Castro',
    email: 'patricia.fernandez@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-22222222',
    telefono: '+58 426 2345678',
    role: 'admin'
  },
  //Especialistas
  {
    nombre: 'Dra. Laura Beatriz',
    apellido: 'Vargas Méndez',
    email: 'laura.vargas@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-78901234',
    telefono: '+58 424 7890123',
    role: 'especialista',
    especialidad: 'Orientación Vocacional',
    numColegiado: 'OV-001'
  },
  {
    nombre: 'Psic. Roberto Carlos',
    apellido: 'Jiménez Pérez',
    email: 'roberto.jimenez@unimet.edu.ve',
    password: 'Unimet123!',
    cedula: 'V-89012345',
    telefono: '+58 424 8901234',
    role: 'especialista',
    especialidad: 'Psicología Educativa',
    numColegiado: 'OV-002'
  },
  // Aspirantes
  {
    nombre: 'Pedro José',
    apellido: 'Ramírez Torres',
    email: 'pedro.ramirez@gmail.com',
    password: 'Unimet123!',
    cedula: 'V-45678901',
    telefono: '+58 416 4567890',
    role: 'aspirante'
  },
  {
    nombre: 'Ana Sofía',
    apellido: 'Morales Sánchez',
    email: 'ana.morales@hotmail.com',
    password: 'Unimet123!',
    cedula: 'V-56789012',
    telefono: '+58 416 5678901',
    role: 'aspirante'
  },
];

module.exports = async () => {
  for (const userData of usuariosData) {
    // Hash password before creating user
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Build where condition
    const whereConditions = [
      { email: userData.email },
      { cedula: userData.cedula }
    ];

    await Usuario.findOrCreate({
      where: {
        [Usuario.sequelize.Sequelize.Op.or]: whereConditions
      },
      defaults: {
        ...userData,
        password: hashedPassword,
        emailVerified: true, // Usuarios de prueba con email verificado
        firstLogin: false // Usuarios de prueba ya tienen contraseña conocida
      }
    });
  }

  // Actualizar usuarios existentes para marcar email como verificado y firstLogin como false
  await Usuario.update(
    {
      emailVerified: true,
      firstLogin: false
    },
    {
      where: {
        email: {
          [Usuario.sequelize.Sequelize.Op.in]: usuariosData.map(u => u.email)
        }
      }
    }
  );
};