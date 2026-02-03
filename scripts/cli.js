const axios = require('axios');

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

class InvoiceManager {
  async createInvoice(amount, description, escrowEnabled = false, expiryHours = 24) {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);
    
    try {
      const response = await axios.post(`${API_BASE}/invoices/create`, {
        amount,
        description,
        escrowEnabled,
        expiryTimestamp
      });
      
      console.log('✅ Invoice created successfully!');
      console.log(`Transaction Hash: ${response.data.transactionHash}`);
      console.log(`Amount: ${amount} BTC`);
      console.log(`Description: ${description}`);
      console.log(`Escrow: ${escrowEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`Expires: ${new Date(expiryTimestamp * 1000).toLocaleString()}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  async payInvoice(invoiceId, useEscrow = false) {
    try {
      const response = await axios.post(`${API_BASE}/invoices/pay`, {
        invoiceId,
        useEscrow
      });
      
      console.log('✅ Invoice paid successfully!');
      console.log(`Transaction Hash: ${response.data.transactionHash}`);
      console.log(`Invoice ID: ${invoiceId}`);
      console.log(`Method: ${useEscrow ? 'Escrow' : 'Direct'}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to pay invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  async releaseEscrow(invoiceId) {
    try {
      const response = await axios.post(`${API_BASE}/invoices/release`, {
        invoiceId
      });
      
      console.log('✅ Escrow released successfully!');
      console.log(`Transaction Hash: ${response.data.transactionHash}`);
      console.log(`Invoice ID: ${invoiceId}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to release escrow:', error.response?.data || error.message);
      throw error;
    }
  }

  async getInvoiceDetails(invoiceId) {
    try {
      const response = await axios.get(`${API_BASE}/invoices/${invoiceId}`);
      const invoice = response.data.invoice;
      
      console.log('📄 Invoice Details:');
      console.log(`ID: ${invoiceId}`);
      console.log(`Creator: ${invoice.creator}`);
      console.log(`Amount: ${invoice.amountInBTC} BTC`);
      console.log(`Description: ${invoice.description}`);
      console.log(`Status: ${invoice.statusText}`);
      console.log(`Escrow: ${invoice.escrowEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`Created: ${new Date(invoice.createdAt * 1000).toLocaleString()}`);
      
      if (invoice.paidAt > 0) {
        console.log(`Paid: ${new Date(invoice.paidAt * 1000).toLocaleString()}`);
      }
      
      return invoice;
    } catch (error) {
      console.error('❌ Failed to get invoice details:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkBalance(address) {
    try {
      const response = await axios.get(`${API_BASE}/invoices/balance/${address}`);
      const { balance, balanceInBTC } = response.data;
      
      console.log('💰 Account Balance:');
      console.log(`Address: ${address}`);
      console.log(`Balance: ${balanceInBTC} BTC`);
      console.log(`Raw Balance: ${balance}`);
      
      return { balance, balanceInBTC };
    } catch (error) {
      console.error('❌ Failed to check balance:', error.response?.data || error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new InvoiceManager();

  switch (command) {
    case 'create':
      if (args.length < 3) {
        console.log('Usage: node cli.js create <amount> <description> [escrow] [expiry-hours]');
        process.exit(1);
      }
      await manager.createInvoice(
        parseFloat(args[1]),
        args[2],
        args[3] === 'true',
        parseInt(args[4]) || 24
      );
      break;

    case 'pay':
      if (args.length < 2) {
        console.log('Usage: node cli.js pay <invoice-id> [escrow]');
        process.exit(1);
      }
      await manager.payInvoice(args[1], args[2] === 'true');
      break;

    case 'release':
      if (args.length < 2) {
        console.log('Usage: node cli.js release <invoice-id>');
        process.exit(1);
      }
      await manager.releaseEscrow(args[1]);
      break;

    case 'details':
      if (args.length < 2) {
        console.log('Usage: node cli.js details <invoice-id>');
        process.exit(1);
      }
      await manager.getInvoiceDetails(args[1]);
      break;

    case 'balance':
      if (args.length < 2) {
        console.log('Usage: node cli.js balance <address>');
        process.exit(1);
      }
      await manager.checkBalance(args[1]);
      break;

    default:
      console.log('BitFlow Invoice Manager CLI');
      console.log('=============================');
      console.log('');
      console.log('Commands:');
      console.log('  create <amount> <description> [escrow] [expiry-hours]');
      console.log('  pay <invoice-id> [escrow]');
      console.log('  release <invoice-id>');
      console.log('  details <invoice-id>');
      console.log('  balance <address>');
      console.log('');
      console.log('Examples:');
      console.log('  node cli.js create 0.1 "Web Development" true 48');
      console.log('  node cli.js pay 123 true');
      console.log('  node cli.js release 123');
      console.log('  node cli.js details 123');
      console.log('  node cli.js balance 0x1234567890123456789012345678901234567890123456789012345678901234');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = InvoiceManager;