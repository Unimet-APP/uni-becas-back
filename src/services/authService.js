const { Usuario, Postulacion, EstudianteBecario, sequelize } = require('../models');
const bcrypt = require('../utils/bcrypt');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { MENSAJES_ERROR } = require('../config/constants');
const emailService = require('./emailService');
const crypto = require('crypto');
const { Op } = require('sequelize');

class AuthService {
  async login(email, password) {
    // Buscar usuario por email (incluir password para validación)
    const usuario = await Usuario.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'password', 'nombre', 'apellido', 'role', 'activo', 'emailVerified', 'firstLogin']
    });

    if (!usuario) {
      throw ApiError.unauthorized(MENSAJES_ERROR.CREDENCIALES_INVALIDAS);
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      throw ApiError.forbidden(MENSAJES_ERROR.USUARIO_INACTIVO);
    }

    // Verificar que la cuenta esté aprobada
    if (!usuario.emailVerified) {
      throw ApiError.forbidden('Tu cuenta está pendiente de aprobación por un administrador');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.comparePassword(password, usuario.password);
    if (!isValidPassword) {
      throw ApiError.unauthorized(MENSAJES_ERROR.CREDENCIALES_INVALIDAS);
    }

    // Consultar el tipoBeca si el usuario es becario
    let tipoBeca = null;
    const becario = await EstudianteBecario.findOne({
      where: { usuarioId: usuario.id },
      attributes: ['tipoBeca', 'estado']
    });

    if (becario) {
      tipoBeca = becario.tipoBeca;
    }

    // Generar tokens
    const tokens = generateTokens({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role
    });

    // Remover password del objeto usuario para la respuesta
    const { password: _, ...usuarioSinPassword } = usuario.toJSON();

    return {
      usuario: {
        ...usuarioSinPassword,
        tipoBeca
      },
      tokens
    };
  }

  async logout(userId) {
    // En este caso simple, el logout es manejado por el cliente
    // removiendo los tokens del almacenamiento local.
    // En un sistema más complejo, podríamos mantener una blacklist
    // de tokens revocados en Redis o la base de datos.

    // Por ahora, simplemente devolvemos éxito
    return { message: 'Logout exitoso' };
  }

  async refreshToken(refreshToken) {
    try {
      // Verificar el refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Buscar usuario para asegurar que aún esté activo
      const usuario = await Usuario.findByPk(decoded.userId, {
        attributes: ['id', 'email', 'role', 'activo']
      });

      if (!usuario) {
        throw ApiError.unauthorized(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
      }

      if (!usuario.activo) {
        throw ApiError.forbidden(MENSAJES_ERROR.USUARIO_INACTIVO);
      }

      // Generar nuevos tokens
      const tokens = generateTokens({
        userId: usuario.id,
        email: usuario.email,
        role: usuario.role
      });

      return { tokens };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.unauthorized('Refresh token inválido');
    }
  }

  async register(datosUsuario) {
    const {
      email, password, nombre, apellido, cedula, telefono,
      role = 'estudiante',
      departamento, cargo, carrera, trimestre
    } = datosUsuario;

    const transaction = await sequelize.transaction();

    try {
      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({
        where: { email: email.toLowerCase() },
        transaction
      });

      if (usuarioExistente) {
        throw ApiError.conflict('Este email ya está registrado');
      }

      // Verificar si la cédula ya existe
      const cedulaExistente = await Usuario.findOne({
        where: { cedula },
        transaction
      });

      if (cedulaExistente) {
        throw ApiError.conflict('Esta cédula ya está registrada');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hashPassword(password);

      // Crear usuario
      const datosCreacion = {
        email: email.toLowerCase(),
        password: hashedPassword,
        nombre,
        apellido,
        cedula,
        telefono,
        role,
        activo: true,
        // Los estudiantes se verifican automáticamente, supervisores y admins requieren aprobación
        emailVerified: role === 'estudiante' ? true : false,
        // Campos opcionales role-específicos
        ...(departamento && { departamento }),
        ...(cargo && { cargo }),
        ...(carrera && { carrera }),
        ...(trimestre && { trimestre })
      };

      const nuevoUsuario = await Usuario.create(datosCreacion, { transaction });

      // Buscar postulaciones sin usuario vinculado que coincidan con la cédula o email
      const postulacionesSinUsuario = await Postulacion.findAll({
        where: {
          usuarioId: null,
          [Op.or]: [
            { cedula },
            { email: email.toLowerCase() }
          ]
        },
        transaction
      });

      // Vincular postulaciones encontradas al nuevo usuario
      if (postulacionesSinUsuario.length > 0) {
        await Promise.all(
          postulacionesSinUsuario.map(postulacion =>
            postulacion.update({ usuarioId: nuevoUsuario.id }, { transaction })
          )
        );
      }

      await transaction.commit();

      // Enviar email de bienvenida si es estudiante (verificación automática)
      if (role === 'estudiante') {
        try {
          await emailService.sendStudentWelcomeEmail(email.toLowerCase(), nombre);
        } catch (emailError) {
          // Log del error pero no fallar el registro si el email falla
          console.error('Error al enviar email de bienvenida:', emailError);
        }
      }

      // Remover password del objeto usuario para la respuesta
      const { password: _, ...usuarioSinPassword } = nuevoUsuario.toJSON();

      return {
        ...usuarioSinPassword,
        postulacionesVinculadas: postulacionesSinUsuario.length
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async forgotPassword(email) {
    // Buscar usuario por email
    const usuario = await Usuario.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'nombre', 'apellido', 'activo']
    });

    if (!usuario) {
      // Por seguridad, no revelamos si el email existe o no
      return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    if (!usuario.activo) {
      // No lanzar error, mantener mensaje genérico por seguridad
      return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    // Generar token único con crypto
    const resetToken = crypto.randomUUID();

    // Calcular fecha de expiración (en minutos, por defecto 15)
    const expiresInMinutes = parseInt(process.env.RESET_PASSWORD_EXPIRES_MIN) || 15;
    const resetExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Guardar token y expiración en la base de datos
    await usuario.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    // Enviar email con el token
    try {
      await emailService.sendPasswordResetEmail(
        usuario.email,
        resetToken,
        `${usuario.nombre} ${usuario.apellido}`
      );
    } catch (emailError) {
      // Si falla el envío del email, limpiar el token
      await usuario.update({
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      // Lanzar error específico
      throw new ApiError(500, 'Error al enviar el email de recuperación. Por favor, intenta más tarde.');
    }

    // Siempre devolver el mismo mensaje (seguridad)
    return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' };
  }

  async resetPassword(token, nuevaPassword) {
    // Buscar usuario con el token válido y no expirado
    const usuario = await Usuario.findOne({
      where: {
        resetPasswordToken: token
      },
      attributes: ['id', 'email', 'nombre', 'apellido', 'resetPasswordToken', 'resetPasswordExpires', 'firstLogin']
    });

    if (!usuario) {
      throw ApiError.badRequest('Token de recuperación inválido o expirado');
    }

    // Bloquear reset de contraseña si es primer login
    // Usuario debe usar la contraseña temporal enviada por email
    if (usuario.firstLogin) {
      throw ApiError.forbidden(
        'Debes usar la contraseña temporal enviada por email para tu primer inicio de sesión. ' +
        'No puedes restablecer tu contraseña hasta que hayas iniciado sesión y cambiado tu contraseña temporal.'
      );
    }

    // Verificar que el token no haya expirado
    if (!usuario.resetPasswordExpires || new Date() > new Date(usuario.resetPasswordExpires)) {
      // Limpiar token expirado
      await usuario.update({
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
      throw ApiError.badRequest('Token de recuperación inválido o expirado');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hashPassword(nuevaPassword);

    // Actualizar contraseña y limpiar tokens de reset
    await usuario.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    // Enviar email de confirmación (no lanzar error si falla)
    try {
      await emailService.sendPasswordChangedConfirmation(
        usuario.email,
        `${usuario.nombre} ${usuario.apellido}`
      );
    } catch (emailError) {
      // Log del error pero no afectar el flujo
      console.error('Error al enviar email de confirmación:', emailError);
    }

    return { message: 'Contraseña restablecida exitosamente' };
  }

  async changePassword(userId, passwordActual, nuevaPassword) {
    // Buscar usuario
    const usuario = await Usuario.findByPk(userId, {
      attributes: ['id', 'password', 'firstLogin']
    });

    if (!usuario) {
      throw ApiError.notFound(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.comparePassword(passwordActual, usuario.password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Contraseña actual incorrecta');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hashPassword(nuevaPassword);

    // Actualizar contraseña y marcar firstLogin como false (ya completó el primer login)
    await usuario.update({
      password: hashedPassword,
      firstLogin: false
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async getUserProfile(userId) {
    const usuario = await Usuario.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      throw ApiError.notFound(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    return usuario;
  }

  async updateProfile(userId, datosActualizacion) {
    const { nombre, apellido, telefono } = datosActualizacion;

    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      throw ApiError.notFound(MENSAJES_ERROR.USUARIO_NO_ENCONTRADO);
    }

    // Actualizar solo los campos permitidos
    const camposPermitidos = { nombre, apellido, telefono };
    const camposLimpios = Object.fromEntries(
      Object.entries(camposPermitidos).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(camposLimpios).length === 0) {
      throw ApiError.badRequest('No se proporcionaron campos válidos para actualizar');
    }

    await usuario.update(camposLimpios);

    // Devolver usuario actualizado sin password
    const { password: _, ...usuarioActualizado } = usuario.toJSON();
    return usuarioActualizado;
  }

  async approveUser(userId) {
    // Buscar usuario por ID con scope 'all' para incluir usuarios inactivos
    const usuario = await Usuario.scope('all').findByPk(userId, {
      attributes: ['id', 'email', 'nombre', 'apellido', 'role', 'activo', 'emailVerified']
    });

    if (!usuario) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    // Verificar si el usuario ya está aprobado
    if (usuario.emailVerified) {
      // Mensaje específico para estudiantes que se verifican automáticamente
      if (usuario.role === 'estudiante') {
        throw ApiError.badRequest('Los estudiantes se verifican automáticamente al registrarse y no requieren aprobación manual');
      }
      throw ApiError.badRequest('Este usuario ya ha sido aprobado');
    }

    // Aprobar usuario
    await usuario.update({ emailVerified: true });

    // Enviar email de notificación de aprobación
    try {
      await emailService.sendAccountApprovedEmail(
        usuario.email,
        `${usuario.nombre} ${usuario.apellido}`
      );
    } catch (emailError) {
      // Log del error pero no afectar el flujo de aprobación
      console.error('Error al enviar email de aprobación:', emailError);
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      role: usuario.role,
      emailVerified: usuario.emailVerified,
      activo: usuario.activo
    };
  }
}

module.exports = new AuthService();
