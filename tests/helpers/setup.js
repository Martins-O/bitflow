// Test environment setup
const { starknet } = require('starknet');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RPC_URL = 'https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY';

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Test utility functions
global.testUtils = {
  // Generate random Starknet address
  randomAddress: () => {
    return '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');
  },

  // Generate random invoice ID
  randomInvoiceId: () => {
    return Math.floor(Math.random() * 1000000);
  },

  // Convert BTC to wei-like units
  btcToWei: (btc) => {
    return BigInt(Math.floor(btc * 1e18));
  },

  // Convert wei-like units to BTC
  weiToBtc: (wei) => {
    return Number(wei) / 1e18;
  },

  // Create mock invoice data
  mockInvoice: (overrides = {}) => ({
    id: testUtils.randomInvoiceId(),
    creator: testUtils.randomAddress(),
    amount: testUtils.btcToWei(0.1),
    description: 'Test Invoice',
    escrowEnabled: false,
    expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
    status: 0, // Pending
    createdAt: Math.floor(Date.now() / 1000),
    paidAt: 0,
    ...overrides
  }),

  // Create mock escrow entry
  mockEscrowEntry: (overrides = {}) => ({
    invoiceId: testUtils.randomInvoiceId(),
    invoiceCreator: testUtils.randomAddress(),
    amount: testUtils.btcToWei(0.1),
    createdAt: Math.floor(Date.now() / 1000),
    releasedAt: 0,
    isActive: true,
    ...overrides
  }),

  // Wait for async operations
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock Starknet contract response
  mockContractResponse: (data) => ({
    success: true,
    transaction_hash: '0x' + Math.random().toString(16).substr(2, 64),
    ...data
  })
};

// Mock starknet module
jest.mock('starknet', () => ({
  starknet: {
    Contract: jest.fn(),
    Account: jest.fn(),
    RpcProvider: jest.fn(),
    bnToUint256: jest.fn((num) => ({
      low: Number(num % 2n**128n),
      high: Number(num >> 128n)
    })),
    uint256ToBN: jest.fn((low, high) => {
      return BigInt(high) * 2n**128n + BigInt(low);
    }),
    shortStringToFelt: jest.fn((str) => str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)),
    longStringToFelt: jest.fn((felt) => 'Converted String'),
    declareIfNot: jest.fn(() => Promise.resolve({
      contractFactory: {
        deploy: jest.fn(() => Promise.resolve({
          waitForDeployment: jest.fn(() => Promise.resolve()),
          address: testUtils.randomAddress()
        }))
      }
    }))
  }
}));

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  testUtils
};