# BitFlow Testing Documentation

This document provides comprehensive information about testing the BitFlow Starknet Bitcoin payment system.

## 🧪 Test Suite Overview

The BitFlow project includes a comprehensive test suite covering all aspects of the system:

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Individual function and component testing
   - Contract service logic
   - Utility functions
   - Mock data generation

2. **Integration Tests** (`tests/integration/`)
   - API endpoint testing
   - Contract interaction testing
   - Database/service integration
   - Cross-component communication

3. **End-to-End Tests** (`tests/e2e/`)
   - Complete workflow testing
   - Multi-user scenarios
   - System performance under load
   - Error recovery scenarios

4. **Smart Contract Tests** (`tests/contracts/`)
   - Cairo contract unit tests
   - Contract interaction patterns
   - State transition testing
   - Security validation

5. **API Tests** (`tests/api/`)
   - REST API endpoint testing
   - Request/response validation
   - Error handling
   - Authentication/authorization

6. **CLI Tests** (`tests/cli/`)
   - Command-line interface testing
   - Script functionality
   - Argument parsing
   - Error handling

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Setup test environment
cp .env.example .env.test
# Edit .env.test with test configuration
```

### Running Individual Test Suites

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run API tests only
npm run test:api

# Run contract tests only
npm run test:contracts

# Run E2E tests only
npm run test:e2e

# Run CLI tests only
npm run test:cli
```

### Running All Tests

```bash
# Run complete test suite
npm test

# Run with coverage
npm run test:coverage

# Run in CI mode (no watch)
npm run test:ci

# Run with watch mode
npm run test:watch
```

### Using the Test Runner Script

```bash
# Run all tests
./scripts/run-tests.sh

# Run specific test suite
./scripts/run-tests.sh unit
./scripts/run-tests.sh integration
./scripts/run-tests.sh api
./scripts/run-tests.sh contracts
./scripts/run-tests.sh e2e
./scripts/run-tests.sh cli

# Run performance tests
./scripts/run-tests.sh performance

# Run code quality checks
./scripts/run-tests.sh quality

# Generate coverage report
./scripts/run-tests.sh coverage
```

## 📊 Test Coverage

### Coverage Requirements

- **Global Coverage**: 80% minimum
- **Core Services**: 90% minimum
- **Scripts**: 85% minimum

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Terminal Output**: Summary during test execution
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: `coverage/lcov.info`
- **JSON Report**: `coverage/coverage-summary.json`

### Coverage Thresholds

```javascript
// jest.config.js
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
  }
}
```

## 🛠️ Test Configuration

### Jest Configuration

The test suite uses Jest with extensive configuration:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'backend/src/**/*.js',
    'scripts/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  // ... more configuration
};
```

### Test Environment Setup

Tests run in a controlled environment:

```javascript
// tests/helpers/setup.js
global.testUtils = {
  randomAddress: () => { /* ... */ },
  mockInvoice: () => { /* ... */ },
  btcToWei: (btc) => { /* ... */ }
  // ... more utilities
};
```

### Mocking Strategy

The test suite uses comprehensive mocking:

```javascript
// Mock Starknet SDK
jest.mock('starknet', () => ({
  starknet: {
    Contract: jest.fn(),
    Account: jest.fn(),
    // ... mocked functions
  }
}));

// Mock HTTP requests
jest.mock('axios');
```

## 📝 Writing Tests

### Test Structure

```javascript
describe('Component/Function Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });

  describe('Specific Feature', () => {
    test('should behave correctly', () => {
      // Arrange
      const input = testUtils.mockInvoice();
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**
   ```javascript
   test('should create invoice with escrow enabled', () => {
     // Clear description of expected behavior
   });
   ```

2. **Arrange-Act-Assert pattern**
   ```javascript
   // Arrange
   const mockData = testUtils.mockInvoice();
   
   // Act
   const result = service.createInvoice(mockData);
   
   // Assert
   expect(result.success).toBe(true);
   ```

3. **Use test utilities**
   ```javascript
   const invoice = testUtils.mockInvoice({
     escrowEnabled: true,
     amount: testUtils.btcToWei(0.5)
   });
   ```

4. **Mock external dependencies**
   ```javascript
   jest.spyOn(contractService, 'createInvoice')
     .mockResolvedValue({ success: true });
   ```

### Async Testing

```javascript
test('should handle async operations', async () => {
  // Arrange
  const promise = Promise.resolve({ data: 'success' });
  
  // Act
  const result = await service.asyncFunction(promise);
  
  // Assert
  expect(result).toBe('success');
});
```

### Error Testing

```javascript
test('should handle errors gracefully', async () => {
  // Arrange
  jest.spyOn(service, 'method')
    .mockRejectedValue(new Error('Test error'));
  
  // Act & Assert
  await expect(service.callMethod())
    .rejects.toThrow('Test error');
});
```

## 🐛 Debugging Tests

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test in debug mode
node --inspect-brk node_modules/.bin/jest tests/unit/contract-service.test.js
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Test Logging

```javascript
// Add debug logging in tests
test('should log debug information', () => {
  console.log('Test input:', testInput);
  console.log('Expected output:', expectedOutput);
  
  const result = functionUnderTest(testInput);
  expect(result).toEqual(expectedOutput);
});
```

## 📈 Continuous Integration

### GitHub Actions Workflow

The CI pipeline runs:

1. **Lint and Format Check**
2. **Unit Tests**
3. **Integration Tests**
4. **E2E Tests**
5. **Contract Tests**
6. **Security Scan**
7. **Coverage Report**
8. **Deployment**

### Test Reports

- **JUnit XML**: `test-results/junit.xml`
- **HTML Report**: `coverage/html-report/test-report.html`
- **JSON Summary**: `test-summary.json`

### Coverage Integration

Coverage is uploaded to Codecov and GitHub for tracking.

## 🔧 Test Utilities

### Available Test Utils

```javascript
// Random data generation
testUtils.randomAddress()      // Starknet address
testUtils.randomInvoiceId()    // Random invoice ID

// Mock data
testUtils.mockInvoice(overrides)
testUtils.mockEscrowEntry(overrides)

// Unit conversion
testUtils.btcToWei(0.1)        // 0.1 BTC to wei
testUtils.weiToBtc(weiAmount)  // Wei to BTC

// Contract responses
testUtils.mockContractResponse(data)

// Async utilities
testUtils.sleep(ms)            // Promise-based delay
```

### Advanced Test Utilities

```javascript
const { AdvancedTestUtils } = require('./tests/helpers/test-utils.test');

// Complex scenarios
const blockchainData = AdvancedTestUtils.createMockBlockchainData(100);
const complexInvoices = AdvancedTestUtils.generateComplexInvoiceScenario(50);

// Network simulation
await AdvancedTestUtils.simulateNetworkLatency(100, 200);
```

## 🚨 Troubleshooting

### Common Issues

1. **Test timeouts**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 60000
   ```

2. **Memory leaks**
   ```bash
   # Run with leak detection
   node --detect-leaks node_modules/.bin/jest
   ```

3. **Port conflicts**
   ```bash
   # Use different test ports
   PORT=3001 npm run test:integration
   ```

4. **Mock conflicts**
   ```javascript
   // Clear mocks between tests
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

### Debug Checklist

- [ ] Environment variables set correctly
- [ ] Test dependencies installed
- [ ] Mocks properly configured
- [ ] Database cleaned between tests
- [ ] No open handles or timers
- [ ] Coverage thresholds met

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest API Testing](https://github.com/visionmedia/supertest)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-testing-and-overall-quality-practices)
- [Starknet.js Testing](https://starknet.js.org/docs/guides/test/)

## 🤝 Contributing to Tests

When adding new features:

1. Write tests before implementation (TDD)
2. Ensure 80%+ coverage
3. Add integration tests for new endpoints
4. Update E2E tests for new workflows
5. Add contract tests for new functions
6. Update documentation

### Test Review Checklist

- [ ] Tests cover happy path
- [ ] Tests cover error scenarios
- [ ] Tests are deterministic
- [ ] Tests are fast and independent
- [ ] Mocks are appropriate
- [ ] Coverage meets requirements