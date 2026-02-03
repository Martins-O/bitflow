const ContractService = require('../../../backend/src/services/contractService');
const { testUtils } = require('../../helpers/setup');

describe('ContractService Unit Tests', () => {
  let contractService;
  let mockStarknet;

  beforeEach(() => {
    contractService = ContractService;
    
    // Reset the service state
    contractService.provider = null;
    contractService.account = null;
    contractService.wbtcToken = null;
    contractService.invoiceRegistry = null;
    contractService.escrowContract = null;
    contractService.initialized = false;
    
    // Mock environment variables
    process.env.RPC_URL = 'https://starknet-testnet.infura.io/v3/test-key';
    process.env.PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890123456789012345678901234';
  });

  describe('Service Initialization', () => {
    test('should initialize successfully with valid environment', async () => {
      await contractService.initialize();
      
      expect(contractService.initialized).toBe(true);
      expect(contractService.provider).toBeDefined();
      expect(contractService.account).toBeDefined();
    });

    test('should not reinitialize if already initialized', async () => {
      await contractService.initialize();
      const firstCall = contractService.initialized;
      
      await contractService.initialize();
      const secondCall = contractService.initialized;
      
      expect(firstCall).toBe(true);
      expect(secondCall).toBe(true);
    });

    test('should handle missing RPC URL', async () => {
      delete process.env.RPC_URL;
      
      await expect(contractService.initialize()).resolves.not.toThrow();
    });

    test('should handle missing account credentials', async () => {
      delete process.env.PRIVATE_KEY;
      
      await expect(contractService.initialize()).resolves.not.toThrow();
      expect(contractService.account).toBeUndefined();
    });
  });

  describe('Invoice Creation', () => {
    beforeEach(async () => {
      await contractService.initialize();
      
      // Mock invoice registry contract
      contractService.invoiceRegistry = {
        invoke: jest.fn()
      };
    });

    test('should create invoice with correct parameters', async () => {
      const amount = 0.1;
      const description = 'Test Invoice';
      const escrowEnabled = true;
      const expiryTimestamp = 1640995200;

      contractService.invoiceRegistry.invoke.mockResolvedValue({
        transaction_hash: '0x1234567890'
      });

      const result = await contractService.createInvoice(
        amount,
        description,
        escrowEnabled,
        expiryTimestamp
      );

      expect(contractService.invoiceRegistry.invoke).toHaveBeenCalledWith(
        'createInvoice',
        [
          100000000000000000, // amount in wei (0.1 * 1e18)
          0,                  // amount high part
          0,                  // description felt (mocked)
          1,                  // escrowEnabled (true)
          expiryTimestamp % 2**128,
          Math.floor(expiryTimestamp / 2**128)
        ]
      );

      expect(result).toEqual({
        transactionHash: '0x1234567890',
        success: true
      });
    });

    test('should handle invoice registry not initialized', async () => {
      contractService.invoiceRegistry = null;

      await expect(contractService.createInvoice(0.1, 'Test', false, 1234567890))
        .rejects.toThrow('InvoiceRegistry contract not initialized');
    });

    test('should handle contract invocation errors', async () => {
      contractService.invoiceRegistry.invoke.mockRejectedValue(new Error('Contract error'));

      await expect(contractService.createInvoice(0.1, 'Test', false, 1234567890))
        .rejects.toThrow('Failed to create invoice: Contract error');
    });

    test('should convert amount correctly', async () => {
      contractService.invoiceRegistry.invoke.mockResolvedValue({
        transaction_hash: '0x123'
      });

      await contractService.createInvoice(1.5, 'Test', false, 1234567890);

      const callArgs = contractService.invoiceRegistry.invoke.mock.calls[0][1];
      expect(callArgs[0]).toBe(1500000000000000000); // 1.5 * 1e18
    });
  });

  describe('Invoice Payment', () => {
    beforeEach(async () => {
      await contractService.initialize();
      
      contractService.invoiceRegistry = {
        invoke: jest.fn(),
        call: jest.fn()
      };
      
      contractService.wbtcToken = {
        invoke: jest.fn()
      };

      // Mock invoice data
      contractService.getInvoice = jest.fn().mockResolvedValue({
        amount: { low: 100000000000000000, high: 0 }
      });
    });

    test('should pay invoice directly without escrow', async () => {
      const invoiceId = '123';
      
      contractService.wbtcToken.invoke.mockResolvedValue({ transaction_hash: '0xapprove' });
      contractService.invoiceRegistry.invoke.mockResolvedValue({ 
        transaction_hash: '0xpay' 
      });

      const result = await contractService.payInvoice(invoiceId, false);

      expect(contractService.wbtcToken.invoke).toHaveBeenCalledWith(
        'approve',
        [
          process.env.INVOICE_REGISTRY_ADDRESS,
          100000000000000000,
          0
        ]
      );

      expect(contractService.invoiceRegistry.invoke).toHaveBeenCalledWith(
        'payInvoice',
        [123, 0] // invoiceId in uint256 format
      );

      expect(result).toEqual({
        transactionHash: '0xpay',
        success: true
      });
    });

    test('should pay invoice with escrow', async () => {
      const invoiceId = '456';
      
      contractService.wbtcToken.invoke.mockResolvedValue({ transaction_hash: '0xapprove' });
      contractService.invoiceRegistry.invoke.mockResolvedValue({ 
        transaction_hash: '0xpay_escrow' 
      });

      const result = await contractService.payInvoice(invoiceId, true);

      expect(contractService.invoiceRegistry.invoke).toHaveBeenCalledWith(
        'payInvoiceWithEscrow',
        [456, 0]
      );

      expect(result).toEqual({
        transactionHash: '0xpay_escrow',
        success: true
      });
    });

    test('should handle contracts not initialized', async () => {
      contractService.invoiceRegistry = null;

      await expect(contractService.payInvoice('123', false))
        .rejects.toThrow('Contracts not initialized');
    });

    test('should handle invoice not found', async () => {
      contractService.getInvoice.mockResolvedValue(null);

      await expect(contractService.payInvoice('999', false))
        .rejects.toThrow('Invoice not found');
    });
  });

  describe('Escrow Release', () => {
    beforeEach(async () => {
      await contractService.initialize();
      
      contractService.escrowContract = {
        invoke: jest.fn()
      };
    });

    test('should release escrow successfully', async () => {
      const invoiceId = '123';
      
      contractService.escrowContract.invoke.mockResolvedValue({
        transaction_hash: '0xrelease'
      });

      const result = await contractService.releaseEscrow(invoiceId);

      expect(contractService.escrowContract.invoke).toHaveBeenCalledWith(
        'release',
        [123, 0] // invoiceId in uint256 format
      );

      expect(result).toEqual({
        transactionHash: '0xrelease',
        success: true
      });
    });

    test('should handle escrow contract not initialized', async () => {
      contractService.escrowContract = null;

      await expect(contractService.releaseEscrow('123'))
        .rejects.toThrow('Escrow contract not initialized');
    });

    test('should handle release errors', async () => {
      contractService.escrowContract.invoke.mockRejectedValue(new Error('Release failed'));

      await expect(contractService.releaseEscrow('123'))
        .rejects.toThrow('Failed to release escrow: Release failed');
    });
  });

  describe('Invoice Retrieval', () => {
    beforeEach(async () => {
      await contractService.initialize();
      
      contractService.invoiceRegistry = {
        call: jest.fn()
      };
    });

    test('should get invoice details', async () => {
      const invoiceId = '123';
      const mockInvoice = {
        id: { low: 123, high: 0 },
        creator: '0xabcdef123456',
        amount: { low: 100000000000000000, high: 0 },
        description: 12345,
        escrowEnabled: 1,
        expiryTimestamp: { low: 1640995200, high: 0 },
        status: 1,
        createdAt: { low: 1640995200, high: 0 },
        paidAt: { low: 1640995300, high: 0 }
      };

      contractService.invoiceRegistry.call.mockResolvedValue({ invoice: mockInvoice });

      const result = await contractService.getInvoice(invoiceId);

      expect(contractService.invoiceRegistry.call).toHaveBeenCalledWith(
        'getInvoice',
        [123, 0]
      );

      expect(result).toEqual({
        id: '123',
        creator: '0xabcdef123456',
        amount: {
          low: '100000000000000000',
          high: '0'
        },
        description: 'Converted String', // from longStringToFelt mock
        escrowEnabled: 1,
        expiryTimestamp: '1640995200',
        status: 1,
        createdAt: '1640995200',
        paidAt: '1640995300'
      });
    });

    test('should handle invoice not found gracefully', async () => {
      contractService.invoiceRegistry.call.mockRejectedValue(new Error('Invoice not found'));

      const result = await contractService.getInvoice('999');
      
      expect(result).toBeNull();
    });

    test('should handle invoice registry not initialized', async () => {
      contractService.invoiceRegistry = null;

      await expect(contractService.getInvoice('123'))
        .rejects.toThrow('InvoiceRegistry contract not initialized');
    });
  });

  describe('Balance Retrieval', () => {
    beforeEach(async () => {
      await contractService.initialize();
      
      contractService.wbtcToken = {
        call: jest.fn()
      };
    });

    test('should get balance successfully', async () => {
      const address = testUtils.randomAddress();
      const balance = 500000000000000000000; // 500 BTC
      
      contractService.wbtcToken.call.mockResolvedValue({
        balance: {
          low: Number(balance % 2n**128n),
          high: Number(balance >> 128n)
        }
      });

      const result = await contractService.getBalance(address);

      expect(contractService.wbtcToken.call).toHaveBeenCalledWith('balanceOf', [address]);
      expect(result).toBe(balance.toString());
    });

    test('should handle zero balance', async () => {
      const address = testUtils.randomAddress();
      
      contractService.wbtcToken.call.mockResolvedValue({
        balance: { low: 0, high: 0 }
      });

      const result = await contractService.getBalance(address);

      expect(result).toBe('0');
    });

    test('should handle wbtc contract not initialized', async () => {
      contractService.wbtcToken = null;

      await expect(contractService.getBalance(testUtils.randomAddress()))
        .rejects.toThrow('WrappedBTC contract not initialized');
    });

    test('should handle balance check errors', async () => {
      const address = testUtils.randomAddress();
      contractService.wbtcToken.call.mockRejectedValue(new Error('Balance check failed'));

      await expect(contractService.getBalance(address))
        .rejects.toThrow('Failed to get balance: Balance check failed');
    });
  });

  describe('ABI Generation', () => {
    test('should generate WrappedBTC ABI', () => {
      const abi = contractService.getWrappedBTCABI();
      
      expect(Array.isArray(abi)).toBe(true);
      expect(abi.length).toBeGreaterThan(0);
      
      const transferFunction = abi.find(func => func.name === 'transfer');
      expect(transferFunction).toBeDefined();
      expect(transferFunction.inputs).toHaveLength(2);
      expect(transferFunction.outputs).toHaveLength(1);
    });

    test('should generate InvoiceRegistry ABI', () => {
      const abi = contractService.getInvoiceRegistryABI();
      
      expect(Array.isArray(abi)).toBe(true);
      expect(abi.length).toBeGreaterThan(0);
      
      const createInvoiceFunction = abi.find(func => func.name === 'createInvoice');
      expect(createInvoiceFunction).toBeDefined();
      expect(createInvoiceFunction.inputs).toHaveLength(4);
      
      const getInvoiceFunction = abi.find(func => func.name === 'getInvoice');
      expect(getInvoiceFunction).toBeDefined();
      expect(getInvoiceFunction.stateMutability).toBe('view');
    });

    test('should generate Escrow ABI', () => {
      const abi = contractService.getEscrowABI();
      
      expect(Array.isArray(abi)).toBe(true);
      expect(abi.length).toBeGreaterThan(0);
      
      const depositFunction = abi.find(func => func.name === 'deposit');
      expect(depositFunction).toBeDefined();
      expect(depositFunction.inputs).toHaveLength(4);
      
      const releaseFunction = abi.find(func => func.name === 'release');
      expect(releaseFunction).toBeDefined();
      expect(releaseFunction.inputs).toHaveLength(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await contractService.initialize();
    });

    test('should handle large invoice IDs', async () => {
      const largeInvoiceId = '18446744073709551615'; // 2^64 - 1
      const mockInvoice = testUtils.mockInvoice({ 
        id: largeInvoiceId 
      });

      contractService.invoiceRegistry = {
        call: jest.fn().mockResolvedValue({ invoice: mockInvoice }),
        invoke: jest.fn()
      };

      const result = await contractService.getInvoice(largeInvoiceId);
      
      expect(result).toBeDefined();
      expect(contractService.invoiceRegistry.call).toHaveBeenCalledWith(
        'getInvoice',
        [18446744073709551615, 0]
      );
    });

    test('should handle zero amount invoices', async () => {
      contractService.invoiceRegistry = {
        invoke: jest.fn()
      };

      await expect(contractService.createInvoice(0, 'Test', false, 1234567890))
        .rejects.toThrow('Failed to create invoice');
    });

    test('should handle negative amount', async () => {
      contractService.invoiceRegistry = {
        invoke: jest.fn()
      };

      await expect(contractService.createInvoice(-0.1, 'Test', false, 1234567890))
        .rejects.toThrow('Failed to create invoice');
    });

    test('should handle very large amounts', async () => {
      contractService.invoiceRegistry = {
        invoke: jest.fn()
      };

      // Very large amount that should still fit in uint256
      await expect(contractService.createInvoice(1e10, 'Test', false, 1234567890))
        .resolves.toBeDefined();
    });

    test('should handle invalid invoice ID format', async () => {
      contractService.invoiceRegistry = {
        call: jest.fn().mockRejectedValue(new Error('Invalid format'))
      };

      await expect(contractService.getInvoice('invalid'))
        .resolves.toBeNull();
    });
  });

  describe('Contract State Management', () => {
    test('should maintain initialization state', async () => {
      expect(contractService.initialized).toBe(false);
      
      await contractService.initialize();
      expect(contractService.initialized).toBe(true);
    });

    test('should reset state properly', async () => {
      await contractService.initialize();
      expect(contractService.initialized).toBe(true);
      
      // Reset state
      contractService.initialized = false;
      contractService.provider = null;
      contractService.account = null;
      
      expect(contractService.initialized).toBe(false);
      expect(contractService.provider).toBeNull();
    });

    test('should handle multiple initialization calls', async () => {
      const init1 = contractService.initialize();
      const init2 = contractService.initialize();
      const init3 = contractService.initialize();
      
      await Promise.all([init1, init2, init3]);
      
      expect(contractService.initialized).toBe(true);
    });
  });
});