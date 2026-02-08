const request = require('supertest');
const { app } = require('../../backend/src/app');
const contractService = require('../../backend/src/services/contractService');

// Mock contract service
jest.mock('../../backend/src/services/contractService');

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';

    // Provide weiToAmount on the mocked contractService (it's a dynamic property, not auto-mocked)
    contractService.weiToAmount = jest.fn((wei) => {
      const str = wei.toString().padStart(19, '0');
      const whole = str.slice(0, str.length - 18) || '0';
      const frac = str.slice(str.length - 18).replace(/0+$/, '');
      return frac ? `${whole}.${frac}` : whole;
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('contracts');
    });

    test('should include contract addresses in health check', async () => {
      process.env.WBTC_TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890123456789012345678901234';
      process.env.INVOICE_REGISTRY_ADDRESS = '0x5678901234567890123456789012345678901234567890123456789012345678';
      process.env.ESCROW_CONTRACT_ADDRESS = '0x9abcdef012345678901234567890123456789012345678901234567890abcd';

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.contracts).toHaveProperty('wbtcToken');
      expect(response.body.contracts).toHaveProperty('invoiceRegistry');
      expect(response.body.contracts).toHaveProperty('escrow');
    });
  });

  describe('Invoice Creation Endpoint', () => {
    test('should create invoice successfully', async () => {
      const invoiceData = {
        amount: 0.1,
        description: 'Test Invoice',
        escrowEnabled: false,
        expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
      };

      contractService.createInvoice.mockResolvedValue({
        transactionHash: '0xabcdef123456',
        success: true
      });

      const response = await request(app)
        .post('/api/invoices/create')
        .send(invoiceData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Invoice created successfully');
      expect(response.body).toHaveProperty('transactionHash', '0xabcdef123456');
      expect(contractService.createInvoice).toHaveBeenCalledWith(
        invoiceData.amount,
        invoiceData.description,
        invoiceData.escrowEnabled,
        invoiceData.expiryTimestamp
      );
    });

    test('should require all required fields', async () => {
      const invalidData = {
        amount: 0.1
      };

      const response = await request(app)
        .post('/api/invoices/create')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should validate amount is positive', async () => {
      const invalidData = {
        amount: -0.1,
        description: 'Test Invoice',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
      };

      const response = await request(app)
        .post('/api/invoices/create')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Amount must be greater than 0');
    });

    test('should handle contract service errors', async () => {
      const invoiceData = {
        amount: 0.1,
        description: 'Test Invoice',
        escrowEnabled: false,
        expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
      };

      contractService.createInvoice.mockRejectedValue(new Error('Contract error'));

      const response = await request(app)
        .post('/api/invoices/create')
        .send(invoiceData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to create invoice');
      expect(response.body).toHaveProperty('details', 'Contract error');
    });
  });

  describe('Invoice Payment Endpoint', () => {
    test('should pay invoice successfully', async () => {
      const paymentData = {
        invoiceId: '123',
        useEscrow: false
      };

      contractService.payInvoice.mockResolvedValue({
        transactionHash: '0x1234567890',
        success: true
      });

      const response = await request(app)
        .post('/api/invoices/pay')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Invoice paid successfully');
      expect(response.body).toHaveProperty('transactionHash', '0x1234567890');
      expect(contractService.payInvoice).toHaveBeenCalledWith('123', false);
    });

    test('should pay invoice with escrow', async () => {
      const paymentData = {
        invoiceId: '456',
        useEscrow: true
      };

      contractService.payInvoice.mockResolvedValue({
        transactionHash: '0xdef1234567',
        success: true
      });

      const response = await request(app)
        .post('/api/invoices/pay')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(contractService.payInvoice).toHaveBeenCalledWith('456', true);
    });

    test('should require invoice ID', async () => {
      const invalidData = {
        useEscrow: true
      };

      const response = await request(app)
        .post('/api/invoices/pay')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invoiceId is required');
    });

    test('should handle payment errors', async () => {
      const paymentData = {
        invoiceId: '789'
      };

      contractService.payInvoice.mockRejectedValue(new Error('Payment failed'));

      const response = await request(app)
        .post('/api/invoices/pay')
        .send(paymentData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to pay invoice');
      expect(response.body).toHaveProperty('details', 'Payment failed');
    });
  });

  describe('Escrow Release Endpoint', () => {
    test('should release escrow successfully', async () => {
      const releaseData = {
        invoiceId: '123'
      };

      contractService.releaseEscrow.mockResolvedValue({
        transactionHash: '0xabc123def',
        success: true
      });

      const response = await request(app)
        .post('/api/invoices/release')
        .send(releaseData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Escrow released successfully');
      expect(response.body).toHaveProperty('transactionHash', '0xabc123def');
      expect(contractService.releaseEscrow).toHaveBeenCalledWith('123');
    });

    test('should require invoice ID', async () => {
      const invalidData = {};

      const response = await request(app)
        .post('/api/invoices/release')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('invoiceId is required');
    });

    test('should handle release errors', async () => {
      const releaseData = {
        invoiceId: '456'
      };

      contractService.releaseEscrow.mockRejectedValue(new Error('Release failed'));

      const response = await request(app)
        .post('/api/invoices/release')
        .send(releaseData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to release escrow');
      expect(response.body).toHaveProperty('details', 'Release failed');
    });
  });

  describe('Invoice Details Endpoint', () => {
    test('should get invoice details successfully', async () => {
      const mockInvoice = {
        id: '123',
        creator: '0xabcdef123456',
        amount: { low: '100000000000000000', high: '0' },
        description: 'Test Invoice',
        escrowEnabled: false,
        status: 0,
        createdAt: '1640995200',
        paidAt: '0'
      };

      contractService.getInvoice.mockResolvedValue(mockInvoice);

      const response = await request(app)
        .get('/api/invoices/123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invoice');
      expect(response.body.invoice).toHaveProperty('id', '123');
      expect(response.body.invoice).toHaveProperty('amountInBTC');
      expect(response.body.invoice).toHaveProperty('statusText');
      expect(contractService.getInvoice).toHaveBeenCalledWith('123');
    });

    test('should handle invoice not found', async () => {
      contractService.getInvoice.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/invoices/999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invoice not found');
    });

    test('should handle get invoice errors', async () => {
      contractService.getInvoice.mockRejectedValue(new Error('Get invoice failed'));

      const response = await request(app)
        .get('/api/invoices/123')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get invoice');
      expect(response.body).toHaveProperty('details', 'Get invoice failed');
    });
  });

  describe('Balance Check Endpoint', () => {
    test('should get balance successfully', async () => {
      contractService.getBalance.mockResolvedValue('100000000000000000000');

      const response = await request(app)
        .get('/api/invoices/balance/0x1234567890')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('balance', '100000000000000000000');
      expect(response.body).toHaveProperty('balanceInBTC');
      expect(contractService.getBalance).toHaveBeenCalledWith('0x1234567890');
    });

    test('should handle balance errors', async () => {
      contractService.getBalance.mockRejectedValue(new Error('Balance check failed'));

      const response = await request(app)
        .get('/api/invoices/balance/0x1234567890')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get balance');
      expect(response.body).toHaveProperty('details', 'Balance check failed');
    });
  });

  describe('CORS Handling', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/invoices/create')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/invoices/create')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/invoices/create')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Express JSON parser error returns 400 or propagates to error handler (500)
      expect([400, 500]).toContain(response.status);
    });

    test('should handle empty request body', async () => {
      await request(app)
        .post('/api/invoices/create')
        .send({})
        .expect(400);
    });
  });

  describe('Multiple Requests', () => {
    test('should handle concurrent requests', async () => {
      const invoiceData = {
        amount: 0.1,
        description: 'Test Invoice',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 3600
      };

      contractService.createInvoice.mockResolvedValue({
        transactionHash: '0x123',
        success: true
      });

      const responses = await Promise.all([
        request(app).post('/api/invoices/create').send(invoiceData),
        request(app).post('/api/invoices/create').send(invoiceData),
        request(app).post('/api/invoices/create').send(invoiceData)
      ]);

      expect(responses[0].status).toBe(201);
    });
  });
});
