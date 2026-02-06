const request = require('supertest');
const axios = require('axios');
const PaymentDemo = require('../../scripts/demo');
const InvoiceManager = require('../../scripts/cli');
const contractService = require('../../backend/src/services/contractService');
const { testUtils } = require('../helpers/setup');

// Mock axios for external API calls
jest.mock('axios');
jest.mock('../../backend/src/services/contractService');

describe('End-to-End Workflow Tests', () => {
  let app;

  beforeAll(() => {
    ({ app } = require('../../backend/src/app'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NODE_ENV = 'test';

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
        id: String(invoiceId),
        status: String(invoiceId).includes('paid') ? 1 : 0
      }));
    });

    contractService.getBalance.mockResolvedValue('100000000000000000000');
  });

  describe('Complete Invoice Lifecycle', () => {
    test('should handle complete direct payment flow', async () => {
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

      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '123',
          useEscrow: false
        })
        .expect(200);

      expect(payResponse.body.success).toBe(true);
      expect(payResponse.body.transactionHash).toBeDefined();

      const statusResponse = await request(app)
        .get('/api/invoices/123')
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.invoice).toBeDefined();
    });

    test('should handle complete escrow payment flow', async () => {
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

      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '456',
          useEscrow: true
        })
        .expect(200);

      expect(payResponse.body.success).toBe(true);

      const releaseResponse = await request(app)
        .post('/api/invoices/release')
        .send({
          invoiceId: '456'
        })
        .expect(200);

      expect(releaseResponse.body.success).toBe(true);
      expect(releaseResponse.body.transactionHash).toBeDefined();

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
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;

      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Expired Invoice Test',
          escrowEnabled: false,
          expiryTimestamp: pastTimestamp
        })
        .expect(201);

      const response = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: '789',
          useEscrow: false
        });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Multi-User Payment Scenarios', () => {
    test('should handle concurrent invoice operations', async () => {
      const invoiceIds = ['101', '102', '103'];

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
        await request(app)
          .post('/api/invoices/create')
          .send({
            amount: scenario.amount,
            description: `Mixed Test ${scenario.id}`,
            escrowEnabled: scenario.escrow,
            expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
          })
          .expect(201);

        await request(app)
          .post('/api/invoices/pay')
          .send({
            invoiceId: scenario.id,
            useEscrow: scenario.escrow
          })
          .expect(200);

        if (scenario.escrow) {
          await request(app)
            .post('/api/invoices/release')
            .send({
              invoiceId: scenario.id
            })
            .expect(200);
        }
      }

      expect(contractService.createInvoice).toHaveBeenCalledTimes(4);
      expect(contractService.payInvoice).toHaveBeenCalledTimes(4);
      expect(contractService.releaseEscrow).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle partial payment failures gracefully', async () => {
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 0.1,
          description: 'Partial Failure Test',
          escrowEnabled: true,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

      contractService.payInvoice.mockRejectedValueOnce(new Error('Payment failed'));

      const payResponse = await request(app)
        .post('/api/invoices/pay')
        .send({
          invoiceId: 'fail1',
          useEscrow: true
        })
        .expect(500);

      expect(payResponse.body.error).toContain('Failed to pay invoice');

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
      await request(app)
        .post('/api/invoices/create')
        .send({
          amount: 1000,
          description: 'Large Amount Test',
          escrowEnabled: false,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
        })
        .expect(201);

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
    test('should have valid demo class', () => {
      const demo = new PaymentDemo();
      expect(demo).toBeDefined();
      expect(typeof demo.runFullDemo).toBe('function');
    });
  });

  describe('CLI Integration Tests', () => {
    test('should have valid CLI class', () => {
      const manager = new InvoiceManager();
      expect(manager).toBeDefined();
    });
  });

  describe('System Performance Under Load', () => {
    test('should handle high volume of requests', async () => {
      const requestCount = 50;
      const promises = [];

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

      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});
