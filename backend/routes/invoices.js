const express = require('express');
const router = express.Router();
const { uint256 } = require('starknet');
const contractService = require('../src/services/contractService');

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

    if (typeof amount !== 'number' || amount <= 0) {
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

// Dispute invoice
router.post('/dispute', async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'invoiceId is required'
      });
    }

    const result = await contractService.disputeInvoice(invoiceId);

    res.json({
      success: true,
      message: 'Invoice disputed successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Dispute invoice error:', error);
    res.status(500).json({
      error: 'Failed to dispute invoice',
      details: error.message
    });
  }
});

// Resolve dispute
router.post('/resolve', async (req, res) => {
  try {
    const { invoiceId, winner } = req.body;

    if (!invoiceId || !winner) {
      return res.status(400).json({
        error: 'invoiceId and winner address are required'
      });
    }

    const result = await contractService.resolveDispute(invoiceId, winner);

    res.json({
      success: true,
      message: 'Dispute resolved successfully',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      error: 'Failed to resolve dispute',
      details: error.message
    });
  }
});

// Get invoices (list/filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.address) {
      filter.address = req.query.address;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit, 10);
    }
    if (req.query.offset) {
      filter.offset = parseInt(req.query.offset, 10);
    }

    const invoices = await contractService.getInvoices(filter);

    const processedInvoices = invoices.map(invoice => {
      const amountBN = uint256.uint256ToBN({ low: invoice.amount.low, high: invoice.amount.high });
      return {
        ...invoice,
        amount: contractService.weiToAmount(amountBN),
      };
    });

    res.json({
      success: true,
      invoices: processedInvoices,
      total: processedInvoices.length
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to get invoices',
      details: error.message
    });
  }
});

// Get account balance — must be defined BEFORE /:id to avoid "balance" matching as an id
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        error: 'Address is required'
      });
    }

    const balance = await contractService.getBalance(address);
    const balanceInBTC = contractService.weiToAmount(BigInt(balance));

    res.json({
      success: true,
      balance,
      balanceInBTC
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to get balance',
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

    const amountBN = uint256.uint256ToBN({ low: invoice.amount.low, high: invoice.amount.high });

    res.json({
      success: true,
      invoice: {
        ...invoice,
        amountRaw: { low: invoice.amount.low, high: invoice.amount.high },
        amount: contractService.weiToAmount(amountBN),
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

module.exports = router;
