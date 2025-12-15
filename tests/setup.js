const { sequelize } = require('../src/models');

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Test database connection established successfully');
    
    // Sync database for tests (this will drop and recreate tables)
    await sequelize.sync({ force: true });
    console.log('Test database synchronized successfully');
  } catch (error) {
    console.error('Unable to connect to test database:', error);
    process.exit(1);
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Clean up database
    if (process.env.NODE_ENV === 'test') {
      await sequelize.drop();
      console.log('Test database cleaned up');
    }
    
    // Close database connection
    await sequelize.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console logs during tests (except for test-specific logs)
if (process.env.NODE_ENV === 'test') {
  // You can uncomment this to suppress logs during tests
  // console.log = jest.fn();
  // console.info = jest.fn();
  // console.warn = jest.fn();
}