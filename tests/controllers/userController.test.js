const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const userService = require('../../src/services/userService');
const jwt = require('jsonwebtoken');
const config = require('../../src/config/config');

describe('User Controller - Scholarship Management System', () => {
  let studentUser, supervisorUser, managerUser;
  let studentToken, supervisorToken, managerToken;

  beforeEach(async () => {
    // Clean up users table before each test
    await User.destroy({ where: {}, truncate: true });

    // Create test users for different roles
    studentUser = await User.create({
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@unimet.edu.ve',
      password: 'Password123!',
      cedula: 'V-12345678',
      carnet: '20191110488',
      telefono: '04161234567',
      tipo_usuario: 'estudiante'
    });

    supervisorUser = await User.create({
      nombre: 'María',
      apellido: 'García',
      email: 'prof.garcia@unimet.edu.ve',
      password: 'SupervisorPass123!',
      cedula: 'V-87654321',
      tipo_usuario: 'supervisor'
    });

    managerUser = await User.create({
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      email: 'admin.becas@unimet.edu.ve',
      password: 'AdminPass123!',
      cedula: 'V-11111111',
      tipo_usuario: 'gestor_becas'
    });

    // Generate tokens for each user type
    studentToken = jwt.sign({ userId: studentUser.id }, config.jwt.secret);
    supervisorToken = jwt.sign({ userId: supervisorUser.id }, config.jwt.secret);
    managerToken = jwt.sign({ userId: managerUser.id }, config.jwt.secret);
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login student successfully with UNIMET email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'juan.perez@unimet.edu.ve',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: {
            id: studentUser.id,
            nombre: 'Juan',
            apellido: 'Pérez',
            email: 'juan.perez@unimet.edu.ve',
            cedula: 'V-12345678',
            carnet: '20191110488',
            tipo_usuario: 'estudiante'
          }
        }
      });

      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    test('should login supervisor successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'prof.garcia@unimet.edu.ve',
          password: 'SupervisorPass123!'
        })
        .expect(200);

      expect(response.body.data.user.tipo_usuario).toBe('supervisor');
    });

    test('should login manager successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin.becas@unimet.edu.ve',
          password: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.data.user.tipo_usuario).toBe('gestor_becas');
    });

    test('should reject login with non-UNIMET email', async () => {
      // This test assumes validation is implemented
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'juan.perez@gmail.com',
          password: 'Password123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'juan.perez@unimet.edu.ve',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/profile', () => {
    test('should return student profile with scholarship-specific fields', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          user: {
            id: studentUser.id,
            nombre: 'Juan',
            apellido: 'Pérez',
            email: 'juan.perez@unimet.edu.ve',
            cedula: 'V-12345678',
            carnet: '20191110488',
            telefono: '04161234567',
            tipo_usuario: 'estudiante'
          }
        }
      });

      // Should not return password
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    test('should allow student to update phone number', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          telefono: '04167654321'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: {
            telefono: '04167654321'
          }
        }
      });
    });

    test('should not allow updating restricted fields', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          cedula: 'V-99999999', // Restricted field
          tipo_usuario: 'gestor_becas' // Restricted field
        })
        .expect(200);

      // Should only update allowed fields
      const updatedUser = await User.findByPk(studentUser.id);
      expect(updatedUser.cedula).toBe('V-12345678'); // Unchanged
      expect(updatedUser.tipo_usuario).toBe('estudiante'); // Unchanged
    });
  });

  describe('GET /api/v1/users', () => {
    test('should allow manager to get all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Usuarios obtenidos exitosamente'
      });

      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    test('should support filtering by user type', async () => {
      const response = await request(app)
        .get('/api/v1/users?tipo_usuario=estudiante')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Should only return students
      const students = response.body.data.users;
      students.forEach(user => {
        expect(user.tipo_usuario).toBe('estudiante');
      });
    });

    test('should not allow student to access all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should not allow supervisor to access all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    test('should allow manager to get user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${studentUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Usuario obtenido exitosamente',
        data: {
          user: {
            id: studentUser.id,
            nombre: 'Juan',
            apellido: 'Pérez',
            tipo_usuario: 'estudiante'
          }
        }
      });
    });

    test('should not allow non-manager to access user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${managerUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Cierre de sesión exitoso'
      });
    });

    test('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Venezuelan ID (cedula) validation', () => {
    test('should validate Venezuelan ID format', async () => {
      const validCedulas = ['V-12345678', 'E-87654321', 'v-11111111'];
      const invalidCedulas = ['12345678', 'X-12345678', 'V123456789'];

      for (const cedula of validCedulas) {
        const user = await User.build({ 
          ...studentUser.dataValues, 
          cedula,
          email: `test${Date.now()}@unimet.edu.ve`
        });
        await expect(user.validate()).resolves.not.toThrow();
      }

      for (const cedula of invalidCedulas) {
        const user = await User.build({ 
          ...studentUser.dataValues, 
          cedula,
          email: `test${Date.now()}@unimet.edu.ve`
        });
        await expect(user.validate()).rejects.toThrow();
      }
    });
  });

  describe('Phone number validation', () => {
    test('should validate Venezuelan phone format', async () => {
      const validPhones = ['04161234567', '+584161234567', '02121234567'];
      const invalidPhones = ['1234567890', '04123456789012', 'phone'];

      for (const telefono of validPhones) {
        const user = await User.build({ 
          ...studentUser.dataValues, 
          telefono,
          email: `test${Date.now()}@unimet.edu.ve`
        });
        await expect(user.validate()).resolves.not.toThrow();
      }

      for (const telefono of invalidPhones) {
        const user = await User.build({ 
          ...studentUser.dataValues, 
          telefono,
          email: `test${Date.now()}@unimet.edu.ve`
        });
        await expect(user.validate()).rejects.toThrow();
      }
    });
  });
});