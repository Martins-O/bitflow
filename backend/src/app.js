const express = require('express');
const cors = require('cors');
require('dotenv').config();

const invoiceRoutes = require('./routes/invoices');
const contractService = require('./services/contractService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    contracts: {
      wbtcToken: process.env.WBTC_TOKEN_ADDRESS,
      invoiceRegistry: process.env.INVOICE_REGISTRY_ADDRESS,
      escrow: process.env.ESCROW_CONTRACT_ADDRESS
    }
  });
});

// Initialize contracts on startup
async function initializeContracts() {
  try {
    console.log('Initializing contracts...');
    await contractService.initialize();
    console.log('Contracts initialized successfully');
  } catch (error) {
    console.error('Failed to initialize contracts:', error.message);
    console.log('Please run npm run deploy to deploy contracts first');
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`BitFlow API server running on port ${PORT}`);
  await initializeContracts();
});

module.exports = app;