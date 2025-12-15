// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// JWT Token Types
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset'
};

// File Types
const ALLOWED_FILE_TYPES = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt'],
  SPREADSHEETS: ['.xls', '.xlsx', '.csv'],
  PRESENTATIONS: ['.ppt', '.pptx'],
  ARCHIVES: ['.zip', '.rar', '.7z']
};

// File Size Limits (in bytes)
const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,    // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024,   // 100MB
  GENERAL: 5 * 1024 * 1024    // 5MB
};

// Date Formats
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'MMMM Do YYYY, h:mm:ss a',
  SHORT: 'MM/DD/YYYY'
};

// Email Types
const EMAIL_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  ACCOUNT_DEACTIVATED: 'account_deactivated',
  NOTIFICATION: 'notification'
};

// Log Levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// API Response Messages
const RESPONSE_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  TOO_MANY_REQUESTS: 'Too many requests',
  
  // Auth specific
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  
  // User specific
  USER_REGISTERED: 'User registered successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully'
};

// Validation Rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 100,
  TOKEN_EXPIRY_MINUTES: 10,
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24
};

// Database Constants
const DB_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  UUID_VERSION: 4
};

// Environment Constants
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Cache Keys
const CACHE_KEYS = {
  USER_PROFILE: 'user_profile_',
  USER_PERMISSIONS: 'user_permissions_',
  SYSTEM_CONFIG: 'system_config',
  RATE_LIMIT: 'rate_limit_'
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SHORT: 300,    // 5 minutes
  MEDIUM: 3600,  // 1 hour
  LONG: 86400    // 24 hours
};

// Regular Expressions
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
};

// Rate Limiting Windows (in milliseconds)
const RATE_LIMIT_WINDOWS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
};

// Security Constants
const SECURITY = {
  BCRYPT_ROUNDS: 12,
  TOKEN_ENTROPY: 32,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  USER_STATUS,
  TOKEN_TYPES,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  DATE_FORMATS,
  EMAIL_TYPES,
  LOG_LEVELS,
  RESPONSE_MESSAGES,
  VALIDATION_RULES,
  DB_CONSTANTS,
  ENVIRONMENTS,
  CACHE_KEYS,
  CACHE_TTL,
  REGEX_PATTERNS,
  RATE_LIMIT_WINDOWS,
  SECURITY
};