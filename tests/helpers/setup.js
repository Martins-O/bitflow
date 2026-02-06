// Test environment setup
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
  randomAddress: () => {
    return '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');
  },

  randomInvoiceId: () => {
    return Math.floor(Math.random() * 1000000);
  },

  btcToWei: (btc) => {
    return BigInt(Math.floor(btc * 1e18));
  },

  weiToBtc: (wei) => {
    return Number(wei) / 1e18;
  },

  mockInvoice: (overrides = {}) => ({
    id: global.testUtils.randomInvoiceId().toString(),
    creator: global.testUtils.randomAddress(),
    amount: { low: '100000000000000000', high: '0' },
    description: 'Test Invoice',
    escrowEnabled: false,
    expiryTimestamp: (Math.floor(Date.now() / 1000) + 3600).toString(),
    status: 0,
    createdAt: Math.floor(Date.now() / 1000).toString(),
    paidAt: '0',
    ...overrides
  }),

  mockEscrowEntry: (overrides = {}) => ({
    invoiceId: global.testUtils.randomInvoiceId().toString(),
    invoiceCreator: global.testUtils.randomAddress(),
    amount: { low: '100000000000000000', high: '0' },
    createdAt: Math.floor(Date.now() / 1000).toString(),
    releasedAt: '0',
    isActive: true,
    ...overrides
  }),

  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  mockContractResponse: (data) => ({
    success: true,
    transaction_hash: '0x' + Math.random().toString(16).substr(2, 64),
    ...data
  })
};

// Mock starknet module — match destructured imports used by contractService
const mockRpcProvider = jest.fn().mockImplementation(() => ({
  getTransactionReceipt: jest.fn().mockResolvedValue({
    execution_status: 'SUCCEEDED',
    block_number: 1
  })
}));

const mockAccount = jest.fn().mockImplementation(() => ({}));

const mockContract = jest.fn().mockImplementation(() => ({
  invoke: jest.fn().mockResolvedValue({ transaction_hash: '0xmock' }),
  call: jest.fn().mockResolvedValue({})
}));

jest.mock('starknet', () => ({
  RpcProvider: mockRpcProvider,
  Account: mockAccount,
  Contract: mockContract,
  uint256: {
    bnToUint256: jest.fn((num) => {
      const bigNum = BigInt(num);
      return {
        low: (bigNum % (2n ** 128n)).toString(),
        high: (bigNum >> 128n).toString()
      };
    }),
    uint256ToBN: jest.fn((val) => {
      if (typeof val === 'object' && val !== null) {
        return BigInt(val.high || 0) * (2n ** 128n) + BigInt(val.low || 0);
      }
      return BigInt(val);
    })
  },
  shortString: {
    encodeShortString: jest.fn((str) => '0x' + Buffer.from(str).toString('hex')),
    decodeShortString: jest.fn((felt) => 'Decoded String')
  }
}));

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  testUtils: global.testUtils
};
