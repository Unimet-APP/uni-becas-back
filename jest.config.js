module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/utils/logger.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Transform files
  transform: {},

  // Module paths
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage directory
  coverageDirectory: 'coverage'
};