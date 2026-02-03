const axios = require('axios');

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

// Demo accounts (in production, use real Starknet accounts)
const CREATOR_ADDRESS = process.env.ACCOUNT_ADDRESS || '0x1234567890123456789012345678901234567890123456789012345678901234';
const PAYER_ADDRESS = '0x9876543210987654321098765432109876543210987654321098765432109876';

class PaymentDemo {
  async runFullDemo() {
    console.log('🚀 Starting BitFlow Payment System Demo');
    console.log('=====================================\n');

    try {
      // Step 1: Create invoices
      console.log('📝 Step 1: Creating Invoices');
      console.log('----------------------------');
      
      const directInvoice = await this.createInvoice(
        0.1,           // 0.1 BTC
        'Payment for Web Development Services',
        false,         // No escrow
        Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      );

      const escrowInvoice = await this.createInvoice(
        0.5,           // 0.5 BTC
        'High-value consulting services',
        true,          // With escrow
        Math.floor(Date.now() / 1000) + 7200 // 2 hours from now
      );

      console.log(`✅ Created direct invoice: ${directInvoice.id}`);
      console.log(`✅ Created escrow invoice: ${escrowInvoice.id}\n`);

      // Step 2: Show initial balances
      console.log('💰 Step 2: Initial Balances');
      console.log('---------------------------');
      
      await this.showBalance('Creator', CREATOR_ADDRESS);
      await this.showBalance('Payer', PAYER_ADDRESS);
      console.log();

      // Step 3: Pay direct invoice
      console.log('💸 Step 3: Paying Direct Invoice');
      console.log('--------------------------------');
      
      await this.payInvoice(directInvoice.id, false);
      console.log();

      // Step 4: Pay escrow invoice
      console.log('🔒 Step 4: Paying Escrow Invoice');
      console.log('--------------------------------');
      
      await this.payInvoice(escrowInvoice.id, true);
      console.log();

      // Step 5: Show invoice statuses
      console.log('📊 Step 5: Invoice Statuses');
      console.log('---------------------------');
      
      await this.showInvoiceStatus(directInvoice.id, 'Direct Invoice');
      await this.showInvoiceStatus(escrowInvoice.id, 'Escrow Invoice');
      console.log();

      // Step 6: Release escrow
      console.log('🔓 Step 6: Releasing Escrow');
      console.log('---------------------------');
      
      await this.releaseEscrow(escrowInvoice.id);
      console.log();

      // Step 7: Final balances and statuses
      console.log('📈 Step 7: Final State');
      console.log('----------------------');
      
      await this.showBalance('Creator', CREATOR_ADDRESS);
      await this.showBalance('Payer', PAYER_ADDRESS);
      
      await this.showInvoiceStatus(directInvoice.id, 'Direct Invoice');
      await this.showInvoiceStatus(escrowInvoice.id, 'Escrow Invoice');
      
      console.log('\n🎉 Demo completed successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
    }
  }

  async createInvoice(amount, description, escrowEnabled, expiryTimestamp) {
    try {
      const response = await axios.post(`${API_BASE}/invoices/create`, {
        amount,
        description,
        escrowEnabled,
        expiryTimestamp
      });

      const invoiceId = this.extractInvoiceIdFromTx(response.data.transactionHash);
      
      console.log(`📄 Invoice created: ${description}`);
      console.log(`   Amount: ${amount} BTC`);
      console.log(`   Escrow: ${escrowEnabled ? 'Yes' : 'No'}`);
      console.log(`   Transaction: ${response.data.transactionHash}`);
      
      return { id: invoiceId, amount, description, escrowEnabled };
    } catch (error) {
      console.error('Failed to create invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  async payInvoice(invoiceId, useEscrow = false) {
    try {
      const response = await axios.post(`${API_BASE}/invoices/pay`, {
        invoiceId,
        useEscrow
      });

      console.log(`💳 Paid invoice ${invoiceId}`);
      console.log(`   Method: ${useEscrow ? 'Escrow' : 'Direct'}`);
      console.log(`   Transaction: ${response.data.transactionHash}`);
    } catch (error) {
      console.error('Failed to pay invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  async releaseEscrow(invoiceId) {
    try {
      const response = await axios.post(`${API_BASE}/invoices/release`, {
        invoiceId
      });

      console.log(`🔓 Released escrow for invoice ${invoiceId}`);
      console.log(`   Transaction: ${response.data.transactionHash}`);
    } catch (error) {
      console.error('Failed to release escrow:', error.response?.data || error.message);
      throw error;
    }
  }

  async showInvoiceStatus(invoiceId, label) {
    try {
      const response = await axios.get(`${API_BASE}/invoices/${invoiceId}`);
      const invoice = response.data.invoice;
      
      console.log(`📋 ${label} (ID: ${invoiceId})`);
      console.log(`   Status: ${invoice.statusText}`);
      console.log(`   Amount: ${invoice.amountInBTC} BTC`);
      console.log(`   Description: ${invoice.description}`);
      console.log(`   Escrow: ${invoice.escrowEnabled ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error(`Failed to get invoice ${invoiceId}:`, error.response?.data || error.message);
    }
  }

  async showBalance(label, address) {
    try {
      const response = await axios.get(`${API_BASE}/invoices/balance/${address}`);
      const { balance, balanceInBTC } = response.data;
      
      console.log(`💼 ${label} Balance:`);
      console.log(`   ${balanceInBTC} BTC`);
      console.log(`   Raw: ${balance} wei`);
    } catch (error) {
      console.error(`Failed to get balance for ${label}:`, error.response?.data || error.message);
    }
  }

  extractInvoiceIdFromTx(txHash) {
    // In a real implementation, you would get the invoice ID from the transaction receipt
    // For demo purposes, generating a sequential ID
    return Math.floor(Math.random() * 1000) + 1;
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new PaymentDemo();
  demo.runFullDemo().catch(console.error);
}

module.exports = PaymentDemo;