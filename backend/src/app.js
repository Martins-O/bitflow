const express = require('express');
const cors = require('cors');
require('dotenv').config();

const invoiceRoutes = require('../routes/invoices');
const contractService = require('./services/contractService');

const app = express();

// CORS - restrict origins in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing with size limit to prevent large-payload DOS
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    contracts: {
      wbtcToken: process.env.WBTC_TOKEN_ADDRESS ? 'configured' : 'not configured',
      invoiceRegistry: process.env.INVOICE_REGISTRY_ADDRESS ? 'configured' : 'not configured',
      escrow: process.env.ESCROW_CONTRACT_ADDRESS ? 'configured' : 'not configured'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

async function initializeContracts () {
  try {
    console.log('Initializing contracts...');
    await contractService.initialize();
    console.log('Contracts initialized successfully');
  } catch (error) {
    console.error('Failed to initialize contracts:', error.message);
    console.log('Please run npm run deploy to deploy contracts first');
  }
}

// Start server only when running directly (not imported as a module)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, async () => {
    console.log(`BitFlow API server running on port ${PORT}`);
    await initializeContracts();
  });
}

module.exports = { app, initializeContracts };
