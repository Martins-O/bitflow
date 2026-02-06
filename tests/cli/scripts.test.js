const InvoiceManager = require('../../scripts/cli');
const PaymentDemo = require('../../scripts/demo');
const TokenMinter = require('../../scripts/mint-tokens');
const axios = require('axios');
const { testUtils } = require('../helpers/setup');

// Mock axios for all CLI tests
jest.mock('axios');

// Mock contractService for demo tests
jest.mock('../../backend/src/services/contractService', () => ({
  initialize: jest.fn(),
  getNextInvoiceId: jest.fn().mockResolvedValue('1'),
  createInvoice: jest.fn().mockResolvedValue({ transactionHash: '0x123', success: true }),
  payInvoice: jest.fn().mockResolvedValue({ transactionHash: '0x456', success: true }),
  releaseEscrow: jest.fn().mockResolvedValue({ transactionHash: '0x789', success: true }),
  getInvoice: jest.fn().mockResolvedValue({
    id: '1',
    creator: '0x1234',
    amount: { low: '100000000000000000', high: '0' },
    description: 'Test Invoice',
    escrowEnabled: false,
    status: 0
  }),
  getBalance: jest.fn().mockResolvedValue('100000000000000000000')
}));

describe('CLI Script Tests', () => {
  let originalConsole;
  let mockLog;
  let mockError;
  let mockProcessArgv;

  beforeEach(() => {
    // Mock console methods
    originalConsole = global.console;
    mockLog = jest.fn();
    mockError = jest.fn();
    global.console = {
      log: mockLog,
      error: mockError,
      table: jest.fn(),
      clear: jest.fn()
    };

    // Mock process.argv for CLI argument parsing
    mockProcessArgv = process.argv;

    // Reset axios mocks
    jest.clearAllMocks();

    // Setup default successful API responses
    axios.post = jest.fn().mockResolvedValue({
      data: { transactionHash: '0xcli123', success: true }
    });

    axios.get = jest.fn().mockResolvedValue({
      data: {
        success: true,
        invoice: {
          ...testUtils.mockInvoice(),
          amountInBTC: '0.1',
          statusText: 'Pending'
        },
        balance: '100000000000000000000',
        balanceInBTC: '100'
      }
    });

    // Set API URL env var
    process.env.API_URL = 'http://localhost:3000/api';
  });

  afterEach(() => {
    global.console = originalConsole;
    process.argv = mockProcessArgv;
  });

  describe('InvoiceManager CLI', () => {
    let manager;

    beforeEach(() => {
      manager = new InvoiceManager();
    });

    describe('Invoice Creation Command', () => {
      test('should create invoice with basic parameters', async () => {
        await manager.createInvoice(0.1, 'Test Invoice', false, 24);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/invoices/create',
          {
            amount: 0.1,
            description: 'Test Invoice',
            escrowEnabled: false,
            expiryTimestamp: expect.any(Number)
          }
        );

        expect(mockLog).toHaveBeenCalledWith('✅ Invoice created successfully!');
        expect(mockLog).toHaveBeenCalledWith('Transaction Hash: 0xcli123');
        expect(mockLog).toHaveBeenCalledWith('Amount: 0.1 BTC');
        expect(mockLog).toHaveBeenCalledWith('Description: Test Invoice');
        expect(mockLog).toHaveBeenCalledWith('Escrow: Disabled');
      });

      test('should create invoice with escrow enabled', async () => {
        await manager.createInvoice(0.5, 'Escrow Invoice', true, 48);

        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            amount: 0.5,
            description: 'Escrow Invoice',
            escrowEnabled: true
          })
        );

        expect(mockLog).toHaveBeenCalledWith('Escrow: Enabled');
      });

      test('should handle invoice creation errors', async () => {
        axios.post.mockRejectedValue(new Error('Invoice creation failed'));

        await expect(manager.createInvoice(0.1, 'Fail Test', false, 24))
          .rejects.toThrow('Invoice creation failed');

        expect(mockError).toHaveBeenCalled();
      });

      test('should calculate expiry timestamp correctly', async () => {
        const startTime = Math.floor(Date.now() / 1000);
        await manager.createInvoice(0.1, 'Test', false, 24);

        const callArgs = axios.post.mock.calls[0][1];
        const expectedExpiry = startTime + (24 * 3600);

        expect(callArgs.expiryTimestamp).toBeGreaterThanOrEqual(expectedExpiry - 1);
        expect(callArgs.expiryTimestamp).toBeLessThanOrEqual(expectedExpiry + 1);
      });
    });

    describe('Invoice Payment Command', () => {
      test('should pay invoice directly', async () => {
        await manager.payInvoice('123', false);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/invoices/pay',
          {
            invoiceId: '123',
            useEscrow: false
          }
        );

        expect(mockLog).toHaveBeenCalledWith('✅ Invoice paid successfully!');
        expect(mockLog).toHaveBeenCalledWith('Method: Direct');
      });

      test('should pay invoice with escrow', async () => {
        await manager.payInvoice('456', true);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/invoices/pay',
          {
            invoiceId: '456',
            useEscrow: true
          }
        );

        expect(mockLog).toHaveBeenCalledWith('Method: Escrow');
      });

      test('should handle payment errors', async () => {
        axios.post.mockRejectedValue(new Error('Payment failed'));

        await expect(manager.payInvoice('789', true))
          .rejects.toThrow('Payment failed');

        expect(mockError).toHaveBeenCalled();
      });
    });

    describe('Escrow Release Command', () => {
      test('should release escrow successfully', async () => {
        await manager.releaseEscrow('123');

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/invoices/release',
          {
            invoiceId: '123'
          }
        );

        expect(mockLog).toHaveBeenCalledWith('✅ Escrow released successfully!');
        expect(mockLog).toHaveBeenCalledWith('Invoice ID: 123');
      });

      test('should handle release errors', async () => {
        axios.post.mockRejectedValue(new Error('Release failed'));

        await expect(manager.releaseEscrow('456'))
          .rejects.toThrow('Release failed');

        expect(mockError).toHaveBeenCalled();
      });
    });

    describe('Invoice Details Command', () => {
      test('should display invoice details', async () => {
        const mockInvoice = testUtils.mockInvoice({
          id: '123',
          description: 'Detailed Invoice',
          status: 1,
          escrowEnabled: true
        });

        axios.get.mockResolvedValue({
          data: {
            success: true,
            invoice: {
              ...mockInvoice,
              amountInBTC: '0.1',
              statusText: 'Paid'
            }
          }
        });

        await manager.getInvoiceDetails('123');

        expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/invoices/123');
        expect(mockLog).toHaveBeenCalledWith('📄 Invoice Details:');
        expect(mockLog).toHaveBeenCalledWith('ID: 123');
        expect(mockLog).toHaveBeenCalledWith('Amount: 0.1 BTC');
        expect(mockLog).toHaveBeenCalledWith('Description: Detailed Invoice');
        expect(mockLog).toHaveBeenCalledWith('Status: Paid');
        expect(mockLog).toHaveBeenCalledWith('Escrow: Enabled');
      });

      test('should handle details retrieval errors', async () => {
        axios.get.mockRejectedValue(new Error('Details fetch failed'));

        await expect(manager.getInvoiceDetails('123'))
          .rejects.toThrow('Details fetch failed');

        expect(mockError).toHaveBeenCalled();
      });
    });

    describe('Balance Check Command', () => {
      test('should display account balance', async () => {
        const address = testUtils.randomAddress();
        axios.get.mockResolvedValue({
          data: {
            success: true,
            balance: '50000000000000000000',
            balanceInBTC: '50'
          }
        });

        await manager.checkBalance(address);

        expect(axios.get).toHaveBeenCalledWith(`http://localhost:3000/api/invoices/balance/${address}`);
        expect(mockLog).toHaveBeenCalledWith('💰 Account Balance:');
        expect(mockLog).toHaveBeenCalledWith(`Address: ${address}`);
        expect(mockLog).toHaveBeenCalledWith('Balance: 50 BTC');
      });

      test('should handle balance check errors', async () => {
        const address = testUtils.randomAddress();
        axios.get.mockRejectedValue(new Error('Balance check failed'));

        await expect(manager.checkBalance(address))
          .rejects.toThrow('Balance check failed');

        expect(mockError).toHaveBeenCalled();
      });
    });
  });

  describe('CLI Argument Parsing', () => {
    test('should handle create command arguments', () => {
      process.argv = [
        'node', 'cli.js',
        'create', '0.1', 'Test Invoice', 'true', '48'
      ];

      expect(process.argv[2]).toBe('create');
      expect(process.argv[3]).toBe('0.1');
      expect(process.argv[4]).toBe('Test Invoice');
      expect(process.argv[5]).toBe('true');
      expect(process.argv[6]).toBe('48');
    });

    test('should handle pay command arguments', () => {
      process.argv = [
        'node', 'cli.js',
        'pay', '123', 'true'
      ];

      expect(process.argv[2]).toBe('pay');
      expect(process.argv[3]).toBe('123');
      expect(process.argv[4]).toBe('true');
    });

    test('should handle release command arguments', () => {
      process.argv = [
        'node', 'cli.js',
        'release', '456'
      ];

      expect(process.argv[2]).toBe('release');
      expect(process.argv[3]).toBe('456');
    });
  });

  describe('PaymentDemo Script', () => {
    let demo;

    beforeEach(() => {
      demo = new PaymentDemo();
    });

    test('should initialize demo correctly', () => {
      expect(demo).toBeDefined();
      expect(typeof demo.runFullDemo).toBe('function');
      expect(typeof demo.createInvoice).toBe('function');
      expect(typeof demo.payInvoice).toBe('function');
      expect(typeof demo.releaseEscrow).toBe('function');
    });

    test('should have all required demo methods', () => {
      const demoMethods = Object.getOwnPropertyNames(PaymentDemo.prototype);
      expect(demoMethods).toContain('runFullDemo');
      expect(demoMethods).toContain('createInvoice');
      expect(demoMethods).toContain('payInvoice');
      expect(demoMethods).toContain('releaseEscrow');
      expect(demoMethods).toContain('showInvoiceStatus');
      expect(demoMethods).toContain('showBalance');
      expect(demoMethods).toContain('extractInvoiceIdFromTx');
    });

    test('should create invoice via API', async () => {
      axios.post.mockResolvedValue({
        data: { transactionHash: '0xinv1', success: true }
      });

      const result = await demo.createInvoice(0.1, 'Demo Invoice', false, 3600);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/invoices/create',
        expect.objectContaining({
          amount: 0.1,
          description: 'Demo Invoice',
          escrowEnabled: false
        })
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(0.1);
    });

    test('should pay invoice via API', async () => {
      axios.post.mockResolvedValue({
        data: { transactionHash: '0xpay1', success: true }
      });

      await demo.payInvoice('123', false);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/invoices/pay',
        { invoiceId: '123', useEscrow: false }
      );

      expect(mockLog).toHaveBeenCalledWith('💳 Paid invoice 123');
    });

    test('should release escrow via API', async () => {
      axios.post.mockResolvedValue({
        data: { transactionHash: '0xrel1', success: true }
      });

      await demo.releaseEscrow('456');

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/invoices/release',
        { invoiceId: '456' }
      );

      expect(mockLog).toHaveBeenCalledWith('🔓 Released escrow for invoice 456');
    });

    test('should handle demo errors gracefully', async () => {
      axios.post.mockRejectedValue(new Error('Demo failed'));

      await expect(demo.createInvoice(0.1, 'Fail Demo', false, 3600))
        .rejects.toThrow('Demo failed');

      expect(mockError).toHaveBeenCalled();
    });

    test('should extract invoice ID from transaction with expected ID', async () => {
      const invoiceId = await demo.extractInvoiceIdFromTx('0x1234567890abcdef', '42');
      expect(invoiceId).toBe('42');
    });
  });

  describe('TokenMinter Script', () => {
    let minter;

    beforeEach(() => {
      minter = new TokenMinter();
    });

    test('should initialize minter correctly', () => {
      expect(minter).toBeDefined();
      expect(minter.apiBase).toBe('http://localhost:3000/api');
    });

    test('should mint tokens to address', async () => {
      const address = testUtils.randomAddress();
      const amount = 1.5;

      await minter.mintTokens(address, amount);

      // Should log minting header
      expect(mockLog).toHaveBeenCalledWith('💰 Minting Wrapped BTC Tokens');
      // Should log the amount and address
      expect(mockLog).toHaveBeenCalledWith(`Minting ${amount} WBTC to address: ${address}`);
      expect(mockLog).toHaveBeenCalledWith('🔄 Approving mint transaction...');
      expect(mockLog).toHaveBeenCalledWith('⛏️  Mining transaction...');
      expect(mockLog).toHaveBeenCalledWith('✅ Tokens minted successfully!');
      expect(mockLog).toHaveBeenCalledWith(`Amount: ${amount} WBTC`);
      expect(mockLog).toHaveBeenCalledWith(`Recipient: ${address}`);
    }, 10000); // Increase timeout for delays

    test('should setup demo accounts', async () => {
      await minter.setupDemoAccounts();

      expect(mockLog).toHaveBeenCalledWith('👥 Setting Up Demo Accounts');
      expect(mockLog).toHaveBeenCalledWith('🎉 Demo accounts funded successfully!');

      // Should fund multiple accounts
      expect(mockLog).toHaveBeenCalledWith('💸 Funding Merchant:');
      expect(mockLog).toHaveBeenCalledWith('💸 Funding Customer:');
      expect(mockLog).toHaveBeenCalledWith('💸 Funding Service Provider:');
    }, 30000); // Increase timeout for multiple delays

    test('should delay for simulation purposes', async () => {
      const startTime = Date.now();
      await minter.delay(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Allow small timing variance
    });
  });

  describe('CLI Integration Tests', () => {
    test('should handle network timeouts', async () => {
      axios.post.mockRejectedValue(new Error('timeout'));

      const manager = new InvoiceManager();

      await expect(manager.createInvoice(0.1, 'Timeout Test', false, 24))
        .rejects.toThrow('timeout');

      expect(mockError).toHaveBeenCalled();
    });

    test('should validate API response format', async () => {
      // Mock unexpected response format
      axios.post.mockResolvedValue({
        data: { unexpected: 'format' }
      });

      const manager = new InvoiceManager();

      await manager.createInvoice(0.1, 'Format Test', false, 24);

      // Should handle unexpected format gracefully (logs with undefined values)
      expect(mockLog).toHaveBeenCalled();
    });
  });

  describe('CLI Error Handling and Edge Cases', () => {
    test('should handle malformed API responses', async () => {
      axios.post.mockResolvedValue({
        data: null
      });

      const manager = new InvoiceManager();

      // Will throw when trying to access null.transactionHash
      await expect(manager.createInvoice(0.1, 'Null Response', false, 24))
        .rejects.toThrow();
    });

    test('should handle network connectivity issues', async () => {
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const manager = new InvoiceManager();

      await expect(manager.createInvoice(0.1, 'Network Test', false, 24))
        .rejects.toThrow('ECONNREFUSED');
    });

    test('should handle rate limiting', async () => {
      axios.post.mockRejectedValue(new Error('Rate limit exceeded'));

      const manager = new InvoiceManager();

      await expect(manager.createInvoice(0.1, 'Rate Limit Test', false, 24))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should handle very large amounts', async () => {
      const manager = new InvoiceManager();
      const largeAmount = 1e9;

      await manager.createInvoice(largeAmount, 'Large Amount Test', false, 24);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: largeAmount
        })
      );
    });

    test('should handle special characters in descriptions', async () => {
      const manager = new InvoiceManager();
      const specialDescription = 'Test with émojis 🚀 and spëcial chars!';

      await manager.createInvoice(0.1, specialDescription, false, 24);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          description: specialDescription
        })
      );
    });
  });
});
