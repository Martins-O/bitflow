const { testUtils } = require('../helpers/setup');

describe('Test Utilities and Helpers', () => {
  describe('Address Generation', () => {
    test('should generate valid Starknet addresses', () => {
      const address1 = testUtils.randomAddress();
      const address2 = testUtils.randomAddress();
      
      expect(address1).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(address2).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(address1).not.toBe(address2);
    });

    test('should generate unique addresses on multiple calls', () => {
      const addresses = new Set();
      
      for (let i = 0; i < 100; i++) {
        addresses.add(testUtils.randomAddress());
      }
      
      expect(addresses.size).toBe(100);
    });
  });

  describe('Invoice ID Generation', () => {
    test('should generate valid invoice IDs', () => {
      const invoiceId1 = testUtils.randomInvoiceId();
      const invoiceId2 = testUtils.randomInvoiceId();
      
      expect(typeof invoiceId1).toBe('number');
      expect(typeof invoiceId2).toBe('number');
      expect(invoiceId1).toBeGreaterThan(0);
      expect(invoiceId2).toBeGreaterThan(0);
      expect(invoiceId1).not.toBe(invoiceId2);
    });

    test('should generate invoice IDs in reasonable range', () => {
      const invoiceIds = [];
      
      for (let i = 0; i < 1000; i++) {
        invoiceIds.push(testUtils.randomInvoiceId());
      }
      
      const max = Math.max(...invoiceIds);
      const min = Math.min(...invoiceIds);
      
      expect(max).toBeLessThan(1000000);
      expect(min).toBeGreaterThan(0);
    });
  });

  describe('BTC Unit Conversions', () => {
    test('should convert BTC to wei correctly', () => {
      expect(testUtils.btcToWei(1)).toBe(1000000000000000000n);
      expect(testUtils.btcToWei(0.1)).toBe(100000000000000000n);
      expect(testUtils.btcToWei(0.01)).toBe(10000000000000000n);
      expect(testUtils.btcToWei(0.001)).toBe(1000000000000000n);
      expect(testUtils.btcToWei(0.0001)).toBe(100000000000000n);
    });

    test('should handle small BTC amounts', () => {
      expect(testUtils.btcToWei(0.00000001)).toBe(10000000000n); // 1 satoshi
      expect(testUtils.btcToWei(0.000000001)).toBe(1000000000n);
    });

    test('should handle large BTC amounts', () => {
      expect(testUtils.btcToWei(1000)).toBe(1000000000000000000000n);
      expect(testUtils.btcToWei(1000000)).toBe(1000000000000000000000000n);
    });

    test('should convert wei to BTC correctly', () => {
      expect(testUtils.weiToBtc(1000000000000000000n)).toBe(1);
      expect(testUtils.weiToBtc(100000000000000000n)).toBe(0.1);
      expect(testUtils.weiToBtc(10000000000000000n)).toBe(0.01);
    });

    test('should handle wei to BTC conversion precision', () => {
      const weiAmount = 1234567890123456789n;
      const btcAmount = testUtils.weiToBtc(weiAmount);
      
      expect(btcAmount).toBeCloseTo(1.2345678901234568, 18);
    });

    test('should be reversible (within precision)', () => {
      const originalBtc = 0.123456789;
      const weiAmount = testUtils.btcToWei(originalBtc);
      const convertedBtc = testUtils.weiToBtc(weiAmount);
      
      expect(convertedBtc).toBeCloseTo(originalBtc, 8);
    });
  });

  describe('Mock Data Generation', () => {
    test('should create mock invoice with default values', () => {
      const invoice = testUtils.mockInvoice();
      
      expect(invoice).toHaveProperty('id');
      expect(invoice).toHaveProperty('creator');
      expect(invoice).toHaveProperty('amount');
      expect(invoice).toHaveProperty('description');
      expect(invoice).toHaveProperty('escrowEnabled');
      expect(invoice).toHaveProperty('expiryTimestamp');
      expect(invoice).toHaveProperty('status');
      expect(invoice).toHaveProperty('createdAt');
      expect(invoice).toHaveProperty('paidAt');
      
      expect(typeof invoice.id).toBe('number');
      expect(typeof invoice.creator).toBe('string');
      expect(typeof invoice.amount).toBe('bigint');
      expect(invoice.description).toBe('Test Invoice');
      expect(typeof invoice.escrowEnabled).toBe('boolean');
      expect(typeof invoice.expiryTimestamp).toBe('number');
      expect(typeof invoice.status).toBe('number');
    });

    test('should create mock invoice with custom overrides', () => {
      const overrides = {
        description: 'Custom Invoice',
        escrowEnabled: true,
        status: 1,
        amount: testUtils.btcToWei(0.5)
      };
      
      const invoice = testUtils.mockInvoice(overrides);
      
      expect(invoice.description).toBe('Custom Invoice');
      expect(invoice.escrowEnabled).toBe(true);
      expect(invoice.status).toBe(1);
      expect(invoice.amount).toBe(testUtils.btcToWei(0.5));
    });

    test('should create mock escrow entry with default values', () => {
      const escrow = testUtils.mockEscrowEntry();
      
      expect(escrow).toHaveProperty('invoiceId');
      expect(escrow).toHaveProperty('invoiceCreator');
      expect(escrow).toHaveProperty('amount');
      expect(escrow).toHaveProperty('createdAt');
      expect(escrow).toHaveProperty('releasedAt');
      expect(escrow).toHaveProperty('isActive');
      
      expect(typeof escrow.invoiceId).toBe('number');
      expect(typeof escrow.invoiceCreator).toBe('string');
      expect(typeof escrow.amount).toBe('bigint');
      expect(typeof escrow.isActive).toBe('boolean');
      expect(escrow.isActive).toBe(true);
    });

    test('should create mock escrow entry with custom overrides', () => {
      const overrides = {
        isActive: false,
        releasedAt: 1640995600,
        amount: testUtils.btcToWei(0.25)
      };
      
      const escrow = testUtils.mockEscrowEntry(overrides);
      
      expect(escrow.isActive).toBe(false);
      expect(escrow.releasedAt).toBe(1640995600);
      expect(escrow.amount).toBe(testUtils.btcToWei(0.25));
    });
  });

  describe('Contract Response Mocking', () => {
    test('should create mock contract response', () => {
      const customData = { customField: 'customValue' };
      const response = testUtils.mockContractResponse(customData);
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('transaction_hash');
      expect(response.transaction_hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(response).toHaveProperty('customField', 'customValue');
    });

    test('should generate unique transaction hashes', () => {
      const response1 = testUtils.mockContractResponse();
      const response2 = testUtils.mockContractResponse();
      
      expect(response1.transaction_hash).not.toBe(response2.transaction_hash);
    });
  });

  describe('Async Utilities', () => {
    test('should sleep for specified time', async () => {
      const startTime = Date.now();
      await testUtils.sleep(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(150); // Allow some tolerance
    });

    test('should handle zero sleep time', async () => {
      const startTime = Date.now();
      await testUtils.sleep(0);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Data Validation Utilities', () => {
    test('should validate address format', () => {
      const validAddress = testUtils.randomAddress();
      const invalidAddresses = [
        '0x123',
        'invalid',
        '0xGHIJKL',
        '0x123456789012345678901234567890123456789012345678901234567890123', // too short
        '0x12345678901234567890123456789012345678901234567890123456789012345' // too long
      ];
      
      expect(validAddress).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      invalidAddresses.forEach(address => {
        expect(address).not.toMatch(/^0x[a-fA-F0-9]{64}$/);
      });
    });

    test('should validate transaction hash format', () => {
      const txHash = testUtils.mockContractResponse().transaction_hash;
      
      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(txHash.length).toBe(66); // 0x + 64 hex chars
    });
  });

  describe('Timestamp Utilities', () => {
    test('should generate realistic timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const invoice = testUtils.mockInvoice();
      const escrow = testUtils.mockEscrowEntry();
      
      expect(invoice.createdAt).toBeGreaterThanOrEqual(now - 1000);
      expect(invoice.createdAt).toBeLessThanOrEqual(now + 1000);
      
      expect(escrow.createdAt).toBeGreaterThanOrEqual(now - 1000);
      expect(escrow.createdAt).toBeLessThanOrEqual(now + 1000);
    });

    test('should handle future expiry timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const invoice = testUtils.mockInvoice({
        expiryTimestamp: futureTimestamp
      });
      
      expect(invoice.expiryTimestamp).toBe(futureTimestamp);
      expect(invoice.expiryTimestamp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('Error Handling Utilities', () => {
    test('should handle invalid conversion inputs gracefully', () => {
      expect(() => testUtils.btcToWei(NaN)).not.toThrow();
      expect(() => testUtils.btcToWei(Infinity)).not.toThrow();
      expect(() => testUtils.btcToWei(-1)).not.toThrow();
      
      expect(() => testUtils.weiToBtc(-1n)).not.toThrow();
    });

    test('should handle edge cases in data generation', () => {
      const emptyOverrides = {};
      const invoice1 = testUtils.mockInvoice(emptyOverrides);
      const invoice2 = testUtils.mockInvoice();
      
      expect(invoice1).toEqual(invoice2);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid data generation', () => {
      const startTime = Date.now();
      const addresses = [];
      const invoiceIds = [];
      const invoices = [];
      
      for (let i = 0; i < 1000; i++) {
        addresses.push(testUtils.randomAddress());
        invoiceIds.push(testUtils.randomInvoiceId());
        invoices.push(testUtils.mockInvoice());
      }
      
      const endTime = Date.now();
      
      expect(addresses.length).toBe(1000);
      expect(invoiceIds.length).toBe(1000);
      expect(invoices.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain uniqueness in large datasets', () => {
      const addresses = new Set();
      const invoiceIds = new Set();
      
      for (let i = 0; i < 10000; i++) {
        addresses.add(testUtils.randomAddress());
        invoiceIds.add(testUtils.randomInvoiceId());
      }
      
      expect(addresses.size).toBe(10000);
      expect(invoiceIds.size).toBeGreaterThan(9000); // Allow some collisions for random numbers
    });
  });
});

// Additional test utilities for complex scenarios
class AdvancedTestUtils {
  static createMockBlockchainData(txCount = 100) {
    const transactions = [];
    const blocks = [];
    
    for (let i = 0; i < txCount; i++) {
      transactions.push({
        hash: testUtils.mockContractResponse().transaction_hash,
        blockNumber: Math.floor(i / 10),
        timestamp: Math.floor(Date.now() / 1000) - (txCount - i) * 600,
        from: testUtils.randomAddress(),
        to: testUtils.randomAddress(),
        amount: testUtils.btcToWei(Math.random() * 10)
      });
    }
    
    for (let i = 0; i < Math.ceil(txCount / 10); i++) {
      blocks.push({
        number: i,
        timestamp: Math.floor(Date.now() / 1000) - (Math.ceil(txCount / 10) - i) * 6000,
        transactions: transactions.slice(i * 10, (i + 1) * 10)
      });
    }
    
    return { transactions, blocks };
  }
  
  static simulateNetworkLatency(minMs = 50, maxMs = 200) {
    return new Promise(resolve => {
      const delay = Math.random() * (maxMs - minMs) + minMs;
      setTimeout(resolve, delay);
    });
  }
  
  static generateComplexInvoiceScenario(invoiceCount = 50) {
    const scenarios = [];
    const statusOptions = [0, 1, 2, 3]; // Pending, Paid, Released, Expired
    
    for (let i = 0; i < invoiceCount; i++) {
      scenarios.push(testUtils.mockInvoice({
        id: i + 1,
        description: `Complex Invoice ${i + 1}`,
        escrowEnabled: Math.random() > 0.5,
        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
        amount: testUtils.btcToWei(Math.random() * 5), // 0-5 BTC
        expiryTimestamp: Math.floor(Date.now() / 1000) + (Math.random() * 7200) // 0-2 hours from now
      }));
    }
    
    return scenarios;
  }
}

describe('Advanced Test Utilities', () => {
  test('should create mock blockchain data', () => {
    const { transactions, blocks } = AdvancedTestUtils.createMockBlockchainData(50);
    
    expect(transactions.length).toBe(50);
    expect(blocks.length).toBe(5);
    expect(blocks[0].transactions.length).toBe(10);
    
    transactions.forEach(tx => {
      expect(tx).toHaveProperty('hash');
      expect(tx).toHaveProperty('blockNumber');
      expect(tx).toHaveProperty('timestamp');
      expect(tx).toHaveProperty('from');
      expect(tx).toHaveProperty('to');
      expect(tx).toHaveProperty('amount');
    });
  });
  
  test('should simulate network latency', async () => {
    const startTime = Date.now();
    await AdvancedTestUtils.simulateNetworkLatency(100, 200);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    expect(endTime - startTime).toBeLessThan(250);
  });
  
  test('should generate complex invoice scenarios', () => {
    const scenarios = AdvancedTestUtils.generateComplexInvoiceScenario(20);
    
    expect(scenarios.length).toBe(20);
    
    scenarios.forEach((invoice, index) => {
      expect(invoice.id).toBe(index + 1);
      expect(invoice.description).toBe(`Complex Invoice ${index + 1}`);
      expect([true, false]).toContain(invoice.escrowEnabled);
      expect([0, 1, 2, 3]).toContain(invoice.status);
    });
  });
});

module.exports = { AdvancedTestUtils };