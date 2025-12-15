const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    format: config.server.env === 'development' ? consoleFormat : logFormat
  })
];

// Add file transports if log file path is configured
if (config.logging.filePath) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Access log file for HTTP requests
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'access.log'),
      level: 'http',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'thesis-backend' },
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Add custom log level for HTTP requests
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Utility functions for structured logging
logger.logUserAction = (userId, action, details = {}) => {
  logger.info('User Action', {
    userId,
    action,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.logAPIRequest = (req, res, duration) => {
  logger.http('API Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${duration}ms`,
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.logDatabase = (operation, table, details = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Performance logging
logger.performance = {
  start: (label) => {
    return process.hrtime();
  },
  
  end: (startTime, label, context = {}) => {
    const diff = process.hrtime(startTime);
    const duration = diff[0] * 1000 + diff[1] * 1e-6; // Convert to milliseconds
    
    logger.info('Performance Metric', {
      label,
      duration: `${duration.toFixed(2)}ms`,
      ...context,
      timestamp: new Date().toISOString()
    });
    
    return duration;
  }
};

module.exports = logger;