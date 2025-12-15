const crypto = require('crypto');
const path = require('path');

const helpers = {
  // Generate random string
  generateRandomString: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate random number
  generateRandomNumber: (min = 100000, max = 999999) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Capitalize first letter
  capitalize: (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Generate full name
  generateFullName: (firstName, lastName) => {
    return `${helpers.capitalize(firstName)} ${helpers.capitalize(lastName)}`;
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Clean phone number (remove non-digits)
  cleanPhoneNumber: (phone) => {
    if (!phone) return phone;
    return phone.replace(/\D/g, '');
  },

  // Format phone number
  formatPhoneNumber: (phone) => {
    const cleaned = helpers.cleanPhoneNumber(phone);
    if (cleaned && cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },

  // Generate slug from text
  generateSlug: (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // Parse query string parameters for pagination
  parsePaginationParams: (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  },

  // Format pagination response
  formatPaginationResponse: (data, totalCount, page, limit) => {
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  },

  // Remove sensitive fields from object
  removeSensitiveFields: (obj, fields = ['password', 'passwordResetToken', 'emailVerificationToken']) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const cleaned = { ...obj };
    fields.forEach(field => {
      delete cleaned[field];
    });
    
    return cleaned;
  },

  // Deep clone object
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => helpers.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = helpers.deepClone(obj[key]);
      });
      return cloned;
    }
  },

  // Check if object is empty
  isEmpty: (obj) => {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  // Get file extension
  getFileExtension: (filename) => {
    if (!filename) return '';
    return path.extname(filename).toLowerCase();
  },

  // Check if file type is allowed
  isAllowedFileType: (filename, allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']) => {
    const extension = helpers.getFileExtension(filename);
    return allowedTypes.includes(extension);
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate unique filename
  generateUniqueFilename: (originalName) => {
    const extension = helpers.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = helpers.generateRandomString(8);
    return `${timestamp}_${random}${extension}`;
  },

  // Mask sensitive data for logging
  maskSensitiveData: (data, fieldsToMask = ['password', 'token', 'secret']) => {
    if (!data || typeof data !== 'object') return data;
    
    const masked = { ...data };
    
    fieldsToMask.forEach(field => {
      if (masked[field]) {
        masked[field] = '***masked***';
      }
    });
    
    return masked;
  },

  // Calculate age from birth date
  calculateAge: (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },

  // Format currency
  formatCurrency: (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  // Debounce function
  debounce: (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Validate UUID
  isValidUUID: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Get client IP address
  getClientIP: (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  },

  // Safe JSON parse
  safeJSONParse: (str, defaultValue = null) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      return defaultValue;
    }
  },

  // Convert to boolean
  toBoolean: (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  }
};

module.exports = helpers;