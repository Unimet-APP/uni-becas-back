const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be defined in environment variables');
}

const generateTokens = (payload) => {
  try {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'sistema-becas-unimet',
      audience: 'sistema-becas-app'
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      JWT_REFRESH_SECRET,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'sistema-becas-unimet',
        audience: 'sistema-becas-app'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN
    };
  } catch (error) {
    throw ApiError.internal('Error generando tokens JWT');
  }
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'sistema-becas-unimet',
      audience: 'sistema-becas-app'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Token inválido');
    }
    throw ApiError.unauthorized('Error verificando token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'sistema-becas-unimet',
      audience: 'sistema-becas-app'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Refresh token inválido');
    }
    throw ApiError.unauthorized('Error verificando refresh token');
  }
};

const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    throw ApiError.unauthorized('Header de autorización requerido');
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Formato de token inválido. Use: Bearer <token>');
  }

  return token;
};

const createTokenPayload = (usuario) => {
  return {
    userId: usuario.id,
    email: usuario.email,
    role: usuario.role,
    nombre: usuario.nombre,
    activo: usuario.activo,
    emailVerified: usuario.emailVerified
  };
};

const decodeTokenWithoutVerifying = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw ApiError.badRequest('Token malformado');
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  createTokenPayload,
  decodeTokenWithoutVerifying
};