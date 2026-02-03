const express = require('express');
const router = express.Router();
const contractService = require('../services/contractService');

// Create invoice
router.post('/create', async (req, res) => {
  try {
    const { amount, description, escrowEnabled, expiryTimestamp } = req.body;

    // Validate input
    if (!amount || !description || expiryTimestamp === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: amount, description, expiryTimestamp'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    const result = await contractService.createInvoice(
      amount,
      description,
      escrowEnabled || false,
      expiryTimestamp
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Failed to create invoice',
      details: error.message
    });
  }
});

// Pay invoice
router.post('/pay', async (req, res) => {
  try {
    const { invoiceId, useEscrow } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'invoiceId is required'
      });
    }

    const result = await contractService.payInvoice(invoiceId, useEscrow);

    res.json({
      success: true,
      message: 'Invoice paid successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Pay invoice error:', error);
    res.status(500).json({
      error: 'Failed to pay invoice',
      details: error.message
    });
  }
});

// Release escrow
router.post('/release', async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'invoiceId is required'
      });
    }

    const result = await contractService.releaseEscrow(invoiceId);

    res.json({
      success: true,
      message: 'Escrow released successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({
      error: 'Failed to release escrow',
      details: error.message
    });
  }
});

// Get invoice details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Invoice ID is required'
      });
    }

    const invoice = await contractService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }

    // Convert amount from wei-like units to regular units
    const amountInBTC = starknet.uint256ToBN(invoice.amount.low, invoice.amount.high).toString() / 1e18;

    res.json({
      success: true,
      invoice: {
        ...invoice,
        amountInBTC: amountInBTC.toString(),
        statusText: getStatusText(invoice.status)
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Failed to get invoice',
      details: error.message
    });
  }
});

// Get account balance
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        error: 'Address is required'
      });
    }

    const balance = await contractService.getBalance(address);
    const balanceInBTC = balance / 1e18;

    res.json({
      success: true,
      balance: balance,
      balanceInBTC: balanceInBTC.toString()
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to get balance',
      details: error.message
    });
  }
});

// Helper function to convert status number to text
function getStatusText(status) {
  const statusMap = {
    0: 'Pending',
    1: 'Paid',
    2: 'Released',
    3: 'Expired'
  };
  return statusMap[status] || 'Unknown';
}

module.exports = router;