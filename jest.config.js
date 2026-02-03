module.exports = {
  // Test environment settings
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],
  
  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/src/**/*.js',
    'scripts/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/jest.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './backend/src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './scripts/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/setup.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Mock patterns
  modulePathIgnorePatterns: [
    '<rootDir>/build/'
  ],
  
  // Transform patterns (if using TypeScript or Babel)
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'BitFlow Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ]
  ],
  
  // Module name mapping for mocks
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/backend/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable'
  },
  
  // Max workers configuration
  maxWorkers: '50%',
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit
  forceExit: true,
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Projects configuration for different test suites
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
      testTimeout: 60000
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
      testTimeout: 120000
    },
    {
      displayName: 'Contract Tests',
      testMatch: ['<rootDir>/tests/contracts/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
      testTimeout: 90000
    },
    {
      displayName: 'API Tests',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
      testTimeout: 45000
    },
    {
      displayName: 'CLI Tests',
      testMatch: ['<rootDir>/tests/cli/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
      testTimeout: 30000
    }
  ]
};