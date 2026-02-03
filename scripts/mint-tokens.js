const axios = require('axios');
require('dotenv').config();

class TokenMinter {
  constructor() {
    this.apiBase = process.env.API_URL || 'http://localhost:3000/api';
  }

  async mintTokens(recipientAddress, amount) {
    console.log('💰 Minting Wrapped BTC Tokens');
    console.log('============================\n');

    try {
      console.log(`Minting ${amount} WBTC to address: ${recipientAddress}`);
      
      // In a real implementation, this would call the mint function on the WBTC contract
      // For demo purposes, we'll simulate the minting process
      
      console.log('🔄 Approving mint transaction...');
      await this.delay(2000);
      
      console.log('⛏️  Mining transaction...');
      await this.delay(3000);
      
      console.log('✅ Tokens minted successfully!');
      console.log(`Amount: ${amount} WBTC`);
      console.log(`Recipient: ${recipientAddress}`);
      console.log('Transaction Hash: 0x' + Math.random().toString(16).substr(2, 64));
      
      console.log('\n💡 Note: This is a simulation. In production, this would:');
      console.log('   1. Call the mint() function on the WrappedBTC contract');
      console.log('   2. Wait for transaction confirmation');
      console.log('   3. Update the token supply');
      
    } catch (error) {
      console.error('❌ Failed to mint tokens:', error.message);
      throw error;
    }
  }

  async setupDemoAccounts() {
    console.log('👥 Setting Up Demo Accounts');
    console.log('==========================\n');

    const accounts = [
      {
        name: 'Merchant',
        address: process.env.ACCOUNT_ADDRESS || '0x1234567890123456789012345678901234567890123456789012345678901234',
        balance: 10
      },
      {
        name: 'Customer',
        address: '0x9876543210987654321098765432109876543210987654321098765432109876',
        balance: 5
      },
      {
        name: 'Service Provider',
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        balance: 2
      }
    ];

    for (const account of accounts) {
      console.log(`💸 Funding ${account.name}:`);
      await this.mintTokens(account.address, account.balance);
      console.log('');
    }

    console.log('🎉 Demo accounts funded successfully!');
    console.log('\nReady to test the payment system with:');
    console.log('• Merchant: 10 WBTC');
    console.log('• Customer: 5 WBTC'); 
    console.log('• Service Provider: 2 WBTC');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const minter = new TokenMinter();

  switch (command) {
    case 'mint':
      if (args.length < 3) {
        console.log('Usage: node mint-tokens.js mint <address> <amount>');
        process.exit(1);
      }
      await minter.mintTokens(args[1], parseFloat(args[2]));
      break;

    case 'setup':
      await minter.setupDemoAccounts();
      break;

    default:
      console.log('Wrapped BTC Token Minter');
      console.log('=========================');
      console.log('');
      console.log('Commands:');
      console.log('  mint <address> <amount>  - Mint specific amount to address');
      console.log('  setup                    - Setup demo accounts with test tokens');
      console.log('');
      console.log('Examples:');
      console.log('  node mint-tokens.js mint 0x1234567890123456789012345678901234567890123456789012345678901234 1.5');
      console.log('  node mint-tokens.js setup');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TokenMinter;