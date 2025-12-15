const bcrypt = require('bcryptjs');
const ApiError = require('./ApiError');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw ApiError.badRequest('Contraseña requerida');
    }

    if (password.length < 8) {
      throw ApiError.badRequest('La contraseña debe tener al menos 8 caracteres');
    }

    if (password.length > 128) {
      throw ApiError.badRequest('La contraseña no puede exceder 128 caracteres');
    }

    // Validar que contenga al menos una letra, un número y un carácter especial
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      throw ApiError.badRequest(
        'La contraseña debe contener al menos una letra, un número y un carácter especial (@$!%*?&)'
      );
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.internal('Error procesando contraseña');
  }
};

const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      throw ApiError.badRequest('Contraseña y hash requeridos');
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.internal('Error verificando contraseña');
  }
};

const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Contraseña requerida');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Debe tener al menos 8 caracteres');
  }

  if (password.length > 128) {
    errors.push('No puede exceder 128 caracteres');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra');
  }

  if (!/\d/.test(password)) {
    errors.push('Debe contener al menos un número');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial (@$!%*?&)');
  }

  // Verificar que no contenga espacios
  if (/\s/.test(password)) {
    errors.push('No puede contener espacios');
  }

  // Verificar patrones comunes débiles
  const weakPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Contraseña demasiado común');
      break;
    }
  }

  return errors;
};

const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';

  // Asegurar al menos un carácter de cada tipo requerido
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Mayúscula
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Número
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // Especial

  // Completar hasta 12 caracteres
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateTemporaryPassword
};