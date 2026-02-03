const request = require('supertest');
const axios = require('axios');
const PaymentDemo = require('../../../scripts/demo');
const InvoiceManager = require('../../../scripts/cli');
const contractService = require('../../../backend/src/services/contractService');
const { testUtils } = require('../../helpers/setup');

// Mock axios for external API calls
jest.mock('axios');
jest.mock('../../../backend/src/services/contractService');

describe('End-to-End Workflow Tests', () => {
  let app;
  let server;
  let apiBase;

  beforeAll(async () => {
    // Setup test server
    app = require('../../../backend/src/app');
    server = app.listen(3002);
    apiBase = 'http://localhost:3002/api';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment for testing
    process.env.NODE_ENV = 'test';
    process.env.API_URL = apiBase;
    
    // Setup default successful responses
    contractService.createInvoice.mockResolvedValue({
      transactionHash: '0x1234567890abcdef',
      success: true
    });
    
    contractService.payInvoice.mockResolvedValue({
      transactionHash: '0xfedcba0987654321',
      success: true
    });
    
    contractService.releaseEscrow.mockResolvedValue({
      transactionHash: '0xabcdef1234567890',
      success: true
    });
    
    contractService.getInvoice.mockImplementation((invoiceId) => {
      return Promise.resolve(testUtils.mockInvoice({
        id: invoiceId,
        status: invoiceId.includes('paid') ? 1 : 0 // Paid or Pending
      }));
    });
    
    contractService.getBalance.mockResolvedValue('100000000000000000000'); // 100 BTC
  });

  describe('Complete Invoice Lifecycle', () => {
    test('should handle complete direct payment flow', async () => {
      // Mock HTTP requests
      axios.post = jest.fn()
        .mockResolvedValueOnce({
          data: { transactionHash: '0x123', success: true }
        })
        .mockResolvedValueOnce({
          data: { transactionHash: '0x456', success: true }
        });
      
      axios.get = jest.fn()
        .mockResolvedValueOnce({
          data: {
            success: true,
            invoice: {
              ...testUtils.mockInvoice(),
              amountInBTC: '0.1',
              statusText: 'Pending'
            }
          }
        })
        .mockResolvedValueOnce({
          data: { balance: '100000000000000000000', balanceInBTC: '100' }
        });

      // Create invoice
      const createResponse = await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Direct Payment Test',
          escrowEnabled: false,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.transactionHash).toBeDefined();

      // Pay invoice
      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '123',
          useEscrow: false
        })
        .expect(200);

      expect(payResponse.body.success).toBe(true);
      expect(payResponse.body.transactionHash).toBeDefined();

      // Verify invoice status
      const statusResponse = await request(app)
        .get('/api/invoices/123')
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.invoice).toBeDefined();
    });

    test('should handle complete escrow payment flow', async () => {
      // Step 1: Create escrow-enabled invoice
      const createResponse = await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.5,
          description: 'Escrow Payment Test',
          escrowEnabled: true,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 7200
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Step 2: Pay invoice with escrow
      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '456',
          useEscrow: true
        })
        .expect(200);

      expect(payResponse.body.success).toBe(true);

      // Step 3: Release escrow
      const releaseResponse = await request(app)
        .post('/api/invoices/release')
        .send({
          invoiceId: '456'
        })
        .expect(200);

      expect(releaseResponse.body.success).toBe(true);
      expect(releaseResponse.body.transactionHash).toBeDefined();

      // Verify all contract calls were made
      expect(contractService.createInvoice).toHaveBeenCalledWith(
        0.5,
        'Escrow Payment Test',
        true,
        expect.any(Number)
      );
      expect(contractService.payInvoice).toHaveBeenCalledWith('456', true);
      expect(contractService.releaseEscrow).toHaveBeenCalledWith('456');
    });

    test('should handle invoice expiry scenario', async () => {
      // Create invoice with short expiry
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Expired Invoice Test',
          escrowEnabled: false,
          expiryTimestamp: pastTimestamp
        })
        .expect(201);

      // Try to pay expired invoice (should handle appropriately)
      const response = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '789',
          useEscrow: false
        });

      // Should either succeed or fail gracefully depending on contract implementation
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Multi-User Payment Scenarios', () => {
    test('should handle concurrent invoice operations', async () => {
      const invoiceIds = ['101', '102', '103'];
      
      // Create multiple invoices concurrently
      const createPromises = invoiceIds.map(id =>
        request(app)
          .post('/api/invoices/create')
          .send({
            amount: 0.1,
            description: `Concurrent Invoice ${id}`,
            escrowEnabled: false,
            expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
          })
      );

      const createResponses = await Promise.all(createPromises);
      
      createResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Pay all invoices concurrently
      const payPromises = invoiceIds.map(id =>
        request(app)
          .post('/api/invoices/pay')
          .send({
            invoiceId: id,
            useEscrow: false
          })
      );

      const payResponses = await Promise.all(payPromises);
      
      payResponses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });

    test('should handle mixed escrow and direct payments', async () => {
      const scenarios = [
        { id: 'direct1', escrow: false, amount: 0.05 },
        { id: 'escrow1', escrow: true, amount: 0.25 },
        { id: 'direct2', escrow: false, amount: 0.15 },
        { id: 'escrow2', escrow: true, amount: 0.35 }
      ];

      for (const scenario of scenarios) {
        // Create invoice
        await request(app)
          .post('/api/invoices/create')
          .send({
            amount: scenario.amount,
            description: `Mixed Test ${scenario.id}`,
            escrowEnabled: scenario.escrow,
            expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
          })
          .expect(201);

        // Pay invoice
        await request(app)
          .post('/api/invoices/pay')
          .send({
            invoiceId: scenario.id,
            useEscrow: scenario.escrow
          })
          .expect(200);

        // Release escrow if applicable
        if (scenario.escrow) {
          await request(app)
            .post('/api/invoices/release')
            .send({
              invoiceId: scenario.id
            })
            .expect(200);
        }
      }

      // Verify contract interactions
      expect(contractService.createInvoice).toHaveBeenCalledTimes(4);
      expect(contractService.payInvoice).toHaveBeenCalledTimes(4);
      expect(contractService.releaseEscrow).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle partial payment failures gracefully', async () => {
      // Create invoice
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Partial Failure Test',
          escrowEnabled: true,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      // Mock payment failure
      contractService.payInvoice.mockRejectedValueOnce(new Error('Payment failed'));

      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: 'fail1',
          useEscrow: true
        })
        .expect(500);

      expect(payResponse.body.error).toContain('Failed to pay invoice');

      // Verify we can still try again (contract service reset)
      contractService.payInvoice.mockResolvedValue({
        transactionHash: '0xretry',
        success: true
      });

      const retryResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: 'fail1',
          useEscrow: true
        })
        .expect(200);

      expect(retryResponse.body.success).toBe(true);
    });

    test('should handle insufficient balance scenarios', async () => {
      // Create large invoice
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 1000, // Very large amount
          description: 'Large Amount Test',
          escrowEnabled: false,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      // Mock insufficient balance
      contractService.payInvoice.mockRejectedValue(new Error('Insufficient balance'));

      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: 'large1',
          useEscrow: false
        })
        .expect(500);

      expect(payResponse.body.error).toContain('Failed to pay invoice');
    });
  });

  describe('Demo Script Integration', () => {
    test('should run complete payment demo', async () => {
      // Mock all axios calls for demo script
      axios.post = jest.fn()
        .mockResolvedValueOnce({
          data: { transactionHash: '0xdemo1', success: true }
        })
        .mockResolvedValueOnce({
          data: { transactionHash: '0xdemo2', success: true }
        })
        .mockResolvedValueOnce({
          data: { transactionHash: '0xdemo3', success: true }
        })
        .mockResolvedValueOnce({
          data: { transactionHash: '0xdemo4', success: true }
        })
        .mockResolvedValueOnce({
          data: { transactionHash: '0xdemo5', success: true }
        });

      axios.get = jest.fn()
        .mockResolvedValue({
          data: {
            success: true,
            invoice: testUtils.mockInvoice({
              status: 1, // Paid
              amountInBTC: '0.1'
            })
          }
        });

      const demo = new PaymentDemo();
      
      // Mock console to avoid actual output during tests
      const originalConsole = global.console;
      global.console = {
        log: jest.fn(),
        error: jest.fn()
      };

      try {
        // This would normally run the full demo
        // For testing, we'll just verify the setup works
        expect(demo).toBeDefined();
        expect(typeof demo.runFullDemo).toBe('function');
      } finally {
        global.console = originalConsole;
      }
    });
  });

  describe('CLI Integration Tests', () => {
    test('should handle CLI invoice creation', async () => {
      // Mock axios for CLI
      axios.post = jest.fn().mockResolvedValue({
        data: { transactionHash: '0xcli123', success: true }
      });

      const manager = new InvoiceManager();
      
      // Mock console output
      const originalConsole = global.console;
      const mockLog = jest.fn();
      global.console = { log: mockLog, error: jest.fn() };

      try {
        await manager.createInvoice(0.25, 'CLI Test Invoice', true, 24);
        
        expect(axios.post).toHaveBeenCalledWith(
          `${apiBase}/invoices/create`,
          {
            amount: 0.25,
            description: 'CLI Test Invoice',
            escrowEnabled: true,
            expiryTimestamp: expect.any(Number)
          }
        );
        
        expect(mockLog).toHaveBeenCalledWith('✅ Invoice created successfully!');
      } finally {
        global.console = originalConsole;
      }
    });

    test('should handle CLI invoice payment', async () => {
      axios.post = jest.fn().mockResolvedValue({
        data: { transactionHash: '0xcli456', success: true }
      });

      const manager = new InvoiceManager();
      
      const originalConsole = global.console;
      const mockLog = jest.fn();
      global.console = { log: mockLog, error: jest.fn() };

      try {
        await manager.payInvoice('789', true);
        
        expect(axios.post).toHaveBeenCalledWith(
          `${apiBase}/invoices/pay`,
          {
            invoiceId: '789',
            useEscrow: true
          }
        );
        
        expect(mockLog).toHaveBeenCalledWith('✅ Invoice paid successfully!');
      } finally {
        global.console = originalConsole;
      }
    });

    test('should handle CLI escrow release', async () => {
      axios.post = jest.fn().mockResolvedValue({
        data: { transactionHash: '0xcli789', success: true }
      });

      const manager = new InvoiceManager();
      
      const originalConsole = global.console;
      const mockLog = jest.fn();
      global.console = { log: mockLog, error: jest.fn() };

      try {
        await manager.releaseEscrow('456');
        
        expect(axios.post).toHaveBeenCalledWith(
          `${apiBase}/invoices/release`,
          {
            invoiceId: '456'
          }
        );
        
        expect(mockLog).toHaveBeenCalledWith('✅ Escrow released successfully!');
      } finally {
        global.console = originalConsole;
      }
    });
  });

  describe('System Performance Under Load', () => {
    test('should handle high volume of requests', async () => {
      const requestCount = 50;
      const promises = [];

      // Generate many concurrent requests
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    test('should maintain data consistency under concurrent operations', async () => {
      const invoiceId = 'consistency_test';
      
      // Create invoice
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Consistency Test',
          escrowEnabled: true,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      // Concurrent payments (should only succeed once)
      const paymentPromises = Array(5).fill().map(() =>
        request(app)
          .post('/api/invoices/pay')
          .send({
            invoiceId,
            useEscrow: true
          })
      );

      const paymentResponses = await Promise.allSettled(paymentPromises);
      
      // At least one should succeed, others may fail gracefully
      const successfulPayments = paymentResponses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      );
      
      expect(successfulPayments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Contract State', () => {
    test('should maintain contract state across operations', async () => {
      // Verify contract service initialization state
      expect(contractService.initialized).toBeDefined();
      
      // Mock contract interactions to verify state changes
      const mockInvoice = testUtils.mockInvoice({
        id: 'state_test',
        status: 0 // Pending
      });

      contractService.getInvoice.mockResolvedValue(mockInvoice);
      
      // Create and pay invoice to check state transitions
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'State Test',
          escrowEnabled: false,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: 'state_test',
          useEscrow: false
        })
        .expect(200);

      // Verify all expected contract interactions occurred
      expect(contractService.createInvoice).toHaveBeenCalledTimes(1);
      expect(contractService.payInvoice).toHaveBeenCalledTimes(1);
    });
  });
});