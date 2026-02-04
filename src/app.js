const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const { specs } = require('./config/swagger');

const app = express();

// Trust proxy if behind load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: config.cors.origins === '*' ? true : config.cors.origins,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Rate limiting - DESHABILITADO EN DESARROLLO
// app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logAPIRequest(req, res, duration);
  });
  
  next();
});

// Swagger API Documentation
const swaggerOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .info .title { color: #3b4151; font-size: 36px }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; border-radius: 4px }
  `,
  customSiteTitle: 'Sistema de Gestión de Becas - API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de Gestión de Becas - Universidad Metropolitana',
    version: '1.0.0',
    description: 'API para la gestión integral de becas universitarias',
    documentation: '/api-docs',
    api: '/api',
    health: '/health',
    environment: config.server.env,
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for undefined routes
app.use(notFound);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Nota: SIGTERM/SIGINT/unhandledRejection/uncaughtException se manejan en server.js
// para evitar duplicados y que el proceso termine sin mostrar el error.
module.exports = app;