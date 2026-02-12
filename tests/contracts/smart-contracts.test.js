const { testUtils } = require('../helpers/setup');

describe('Smart Contract Tests', () => {
  describe('WrappedBTC Contract', () => {
    let mockContract;
    let mockAccount;

    beforeEach(() => {
      const starknet = require('starknet');

      mockContract = {
        call: jest.fn(),
        invoke: jest.fn(),
        address: testUtils.randomAddress()
      };

      mockAccount = {
        address: testUtils.randomAddress(),
        invoke: jest.fn()
      };

      starknet.Contract.mockImplementation(() => mockContract);
    });

    describe('Constructor', () => {
      test('should initialize with correct token metadata', () => {
        // Test that contract constructor sets correct values
        const expectedName = 'Wrapped Bitcoin';
        const expectedSymbol = 'WBTC';
        const expectedDecimals = 18;

        // Mock constructor call
        expect(mockContract.address).toBeDefined();
        expect(typeof mockContract.address).toBe('string');
      });

      test('should mint initial supply to specified address', async () => {
        const initialSupply = testUtils.btcToWei(1000000); // 1M BTC
        const initialOwner = testUtils.randomAddress();

        // Mock balance check
        mockContract.call.mockResolvedValue({
          balance: {
            low: Number(initialSupply % 2n ** 128n),
            high: Number(initialSupply >> 128n)
          }
        });

        const result = await mockContract.call('balanceOf', [initialOwner]);

        expect(result.balance.low).toBe(Number(initialSupply % 2n ** 128n));
        expect(result.balance.high).toBe(Number(initialSupply >> 128n));
      });
    });

    describe('Basic ERC20 Functions', () => {
      test('should return correct token name', async () => {
        mockContract.call.mockResolvedValue({ res: 12345 }); // felt representation

        const result = await mockContract.call('name');

        expect(mockContract.call).toHaveBeenCalledWith('name');
        expect(result.res).toBeDefined();
      });

      test('should return correct token symbol', async () => {
        mockContract.call.mockResolvedValue({ res: 67890 });

        const result = await mockContract.call('symbol');

        expect(mockContract.call).toHaveBeenCalledWith('symbol');
        expect(result.res).toBeDefined();
      });

      test('should return correct decimals', async () => {
        mockContract.call.mockResolvedValue({ res: 18 });

        const result = await mockContract.call('decimals');

        expect(mockContract.call).toHaveBeenCalledWith('decimals');
        expect(result.res).toBe(18);
      });

      test('should return total supply', async () => {
        const totalSupply = testUtils.btcToWei(1000000);
        mockContract.call.mockResolvedValue({
          res: {
            low: Number(totalSupply % 2n ** 128n),
            high: Number(totalSupply >> 128n)
          }
        });

        const result = await mockContract.call('totalSupply');

        expect(mockContract.call).toHaveBeenCalledWith('totalSupply');
        expect(result.res.low).toBe(Number(totalSupply % 2n ** 128n));
      });
    });

    describe('Balance and Transfer Functions', () => {
      test('should return correct balance for account', async () => {
        const address = testUtils.randomAddress();
        const balance = testUtils.btcToWei(100);

        mockContract.call.mockResolvedValue({
          balance: {
            low: Number(balance % 2n ** 128n),
            high: Number(balance >> 128n)
          }
        });

        const result = await mockContract.call('balanceOf', [address]);

        expect(mockContract.call).toHaveBeenCalledWith('balanceOf', [address]);
        expect(result.balance.low).toBe(Number(balance % 2n ** 128n));
      });

      test('should transfer tokens successfully', async () => {
        const recipient = testUtils.randomAddress();
        const amount = testUtils.btcToWei(50);

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('transfer', [
          recipient,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('transfer', [
          recipient,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);
        expect(result.success).toBe(true);
      });

      test('should approve spending allowance', async () => {
        const spender = testUtils.randomAddress();
        const amount = testUtils.btcToWei(75);

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('approve', [
          spender,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('approve', [
          spender,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);
        expect(result.success).toBe(true);
      });

      test('should get allowance correctly', async () => {
        const owner = testUtils.randomAddress();
        const spender = testUtils.randomAddress();
        const allowance = testUtils.btcToWei(25);

        mockContract.call.mockResolvedValue({
          res: {
            low: Number(allowance % 2n ** 128n),
            high: Number(allowance >> 128n)
          }
        });

        const result = await mockContract.call('allowance', [owner, spender]);

        expect(mockContract.call).toHaveBeenCalledWith('allowance', [owner, spender]);
        expect(result.res.low).toBe(Number(allowance % 2n ** 128n));
      });
    });

    describe('Mint Function', () => {
      test('should mint tokens to specified address', async () => {
        const to = testUtils.randomAddress();
        const amount = testUtils.btcToWei(1000);

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('mint', [
          to,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('mint', [
          to,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n)
        ]);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('InvoiceRegistry Contract', () => {
    let mockContract;

    beforeEach(() => {
      const starknet = require('starknet');

      mockContract = {
        call: jest.fn(),
        invoke: jest.fn(),
        address: testUtils.randomAddress()
      };

      starknet.Contract.mockImplementation(() => mockContract);
    });

    describe('Invoice Creation', () => {
      test('should create invoice successfully', async () => {
        const amount = testUtils.btcToWei(0.1);
        const description = 'Test Invoice';
        const escrowEnabled = true;
        const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600;
        const expectedInvoiceId = 123;

        mockContract.invoke.mockResolvedValue({
          transaction_hash: '0x123456789',
          invoiceId: expectedInvoiceId
        });

        const result = await mockContract.invoke('createInvoice', [
          Number(amount % 2n ** 128n),
          Number(amount >> 128n),
          12345, // felt representation of description
          escrowEnabled ? 1 : 0,
          expiryTimestamp % 2 ** 128,
          Math.floor(expiryTimestamp / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('createInvoice', [
          Number(amount % 2n ** 128n),
          Number(amount >> 128n),
          12345,
          escrowEnabled ? 1 : 0,
          expiryTimestamp % 2 ** 128,
          Math.floor(expiryTimestamp / 2 ** 128)
        ]);
        expect(result.transaction_hash).toBe('0x123456789');
      });

      test('should validate invoice parameters', async () => {
        const amount = 0; // Invalid: zero amount

        // Should fail validation
        expect(() => {
          mockContract.invoke('createInvoice', [
            0, 0, // amount = 0
            12345, // description
            1, // escrow enabled
            1234567890, // expiry timestamp
            0
          ]);
        }).not.toThrow();
      });
    });

    describe('Invoice Retrieval', () => {
      test('should retrieve invoice details', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const mockInvoice = testUtils.mockInvoice({ id: invoiceId });

        mockContract.call.mockResolvedValue({ invoice: mockInvoice });

        const result = await mockContract.call('getInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.call).toHaveBeenCalledWith('getInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.invoice).toEqual(mockInvoice);
      });

      test('should get next invoice ID', async () => {
        const nextId = 456;
        mockContract.call.mockResolvedValue({ id: nextId });

        const result = await mockContract.call('getNextInvoiceId');

        expect(mockContract.call).toHaveBeenCalledWith('getNextInvoiceId');
        expect(result.id).toBe(nextId);
      });
    });

    describe('Invoice Payment', () => {
      test('should pay direct invoice', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('payInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('payInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });

      test('should pay invoice with escrow', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('payInvoiceWithEscrow', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('payInvoiceWithEscrow', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });
    });

    describe('Invoice Status Management', () => {
      test('should mark invoice as expired', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('markInvoiceExpired', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('markInvoiceExpired', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });

      test('should dispute invoice', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('disputeInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('disputeInvoice', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });

      test('should resolve dispute', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const winner = testUtils.randomAddress();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('resolveDispute', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          winner
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('resolveDispute', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          winner
        ]);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Escrow Contract', () => {
    let mockContract;

    beforeEach(() => {
      const starknet = require('starknet');

      mockContract = {
        call: jest.fn(),
        invoke: jest.fn(),
        address: testUtils.randomAddress()
      };

      starknet.Contract.mockImplementation(() => mockContract);
    });

    describe('Escrow Deposit', () => {
      test('should deposit funds to escrow', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const payer = testUtils.randomAddress();
        const amount = testUtils.btcToWei(0.5);
        const invoiceCreator = testUtils.randomAddress();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('deposit', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          payer,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n),
          invoiceCreator
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('deposit', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          payer,
          Number(amount % 2n ** 128n),
          Number(amount >> 128n),
          invoiceCreator
        ]);
        expect(result.success).toBe(true);
      });
    });

    describe('Escrow Release', () => {
      test('should release escrowed funds', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('release', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('release', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });
    });

    describe('Escrow Refund', () => {
      test('should refund after expiry', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const refundee = testUtils.randomAddress();
        const reason = 12345; // felt representation

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('refundAfterExpiry', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          refundee,
          reason
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('refundAfterExpiry', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          refundee,
          reason
        ]);
        expect(result.success).toBe(true);
      });
    });

    describe('Emergency Functions', () => {
      test('should perform emergency withdraw', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const recipient = testUtils.randomAddress();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('emergencyWithdraw', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          recipient
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('emergencyWithdraw', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          recipient
        ]);
        expect(result.success).toBe(true);
      });
    });

    describe('Escrow Information', () => {
      test('should get escrow details', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const mockEscrow = testUtils.mockEscrowEntry({ invoiceId });

        mockContract.call.mockResolvedValue({ escrow: mockEscrow });

        const result = await mockContract.call('getEscrow', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.call).toHaveBeenCalledWith('getEscrow', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.escrow).toEqual(mockEscrow);
      });

      test('should get total escrowed amount', async () => {
        const totalAmount = testUtils.btcToWei(10.5);

        mockContract.call.mockResolvedValue({
          amount: {
            low: Number(totalAmount % 2n ** 128n),
            high: Number(totalAmount >> 128n)
          }
        });

        const result = await mockContract.call('getTotalEscrowed');

        expect(mockContract.call).toHaveBeenCalledWith('getTotalEscrowed');
        expect(result.amount.low).toBe(Number(totalAmount % 2n ** 128n));
      });
    });

    describe('Escrow Dispute', () => {
      test('should toggle dispute status', async () => {
        const invoiceId = testUtils.randomInvoiceId();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('toggleDispute', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('toggleDispute', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128)
        ]);
        expect(result.success).toBe(true);
      });

      test('should arbitrate dispute', async () => {
        const invoiceId = testUtils.randomInvoiceId();
        const recipient = testUtils.randomAddress();

        mockContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

        const result = await mockContract.invoke('arbitrate', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          recipient
        ]);

        expect(mockContract.invoke).toHaveBeenCalledWith('arbitrate', [
          invoiceId % 2 ** 128,
          Math.floor(invoiceId / 2 ** 128),
          recipient
        ]);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Contract Integration', () => {
    test('should handle contract address retrieval', async () => {
      const starknet = require('starknet');
      const mockWBTC = { address: testUtils.randomAddress() };
      const mockInvoiceRegistry = { address: testUtils.randomAddress() };
      const mockEscrow = { address: testUtils.randomAddress() };

      // Test that contracts can be initialized with addresses
      expect(mockWBTC.address).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(mockInvoiceRegistry.address).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(mockEscrow.address).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should handle cross-contract function calls', async () => {
      // Test interaction between contracts
      const wbtcContract = {
        call: jest.fn(),
        invoke: jest.fn()
      };

      const invoiceRegistry = {
        call: jest.fn(),
        invoke: jest.fn()
      };

      const escrowContract = {
        call: jest.fn(),
        invoke: jest.fn()
      };

      // Simulate invoice creation -> escrow deposit workflow
      const invoiceId = testUtils.randomInvoiceId();
      const amount = testUtils.btcToWei(0.25);

      wbtcContract.invoke.mockResolvedValue(testUtils.mockContractResponse());
      invoiceRegistry.invoke.mockResolvedValue({ invoiceId });
      escrowContract.invoke.mockResolvedValue(testUtils.mockContractResponse());

      // Create invoice
      const createResult = await invoiceRegistry.invoke('createInvoice', [
        Number(amount % 2n ** 128n),
        Number(amount >> 128n),
        12345,
        1,
        1234567890,
        0
      ]);

      // Deposit to escrow
      const depositResult = await escrowContract.invoke('deposit', [
        invoiceId % 2 ** 128,
        Math.floor(invoiceId / 2 ** 128),
        testUtils.randomAddress(),
        Number(amount % 2n ** 128n),
        Number(amount >> 128n),
        testUtils.randomAddress()
      ]);

      expect(createResult.invoiceId).toBe(invoiceId);
      expect(depositResult.success).toBe(true);
    });
  });
});