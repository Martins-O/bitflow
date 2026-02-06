module.exports = {
  testEnvironment: 'node',

  testMatch: [
    '**/tests/**/*.test.js'
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    'backend/src/**/*.js',
    'scripts/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!jest.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/setup.js'
  ],

  testTimeout: 30000,

  verbose: true,

  modulePathIgnorePatterns: [
    '<rootDir>/build/'
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1'
  },

  clearMocks: true,
  restoreMocks: true,

  maxWorkers: '50%',

  detectOpenHandles: true,
  forceExit: true,

  cacheDirectory: '<rootDir>/.jest-cache'
};
