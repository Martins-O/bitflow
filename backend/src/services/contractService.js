const starknet = require('starknet');

class ContractService {
  constructor() {
    this.provider = null;
    this.account = null;
    this.wbtcToken = null;
    this.invoiceRegistry = null;
    this.escrowContract = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize provider
      this.provider = new starknet.RpcProvider({
        nodeUrl: process.env.RPC_URL || 'https://starknet-testnet.infura.io/v3/YOUR_INFURA_KEY'
      });

      // Initialize account
      if (process.env.PRIVATE_KEY && process.env.ACCOUNT_ADDRESS) {
        this.account = new starknet.Account(
          this.provider,
          process.env.ACCOUNT_ADDRESS,
          process.env.PRIVATE_KEY
        );
      }

      // Contract ABIs (simplified - in production, load from compiled contracts)
      const wbtcABI = this.getWrappedBTCABI();
      const invoiceRegistryABI = this.getInvoiceRegistryABI();
      const escrowABI = this.getEscrowABI();

      // Initialize contracts
      if (process.env.WBTC_TOKEN_ADDRESS) {
        this.wbtcToken = new starknet.Contract(
          wbtcABI,
          process.env.WBTC_TOKEN_ADDRESS,
          this.account || this.provider
        );
      }

      if (process.env.INVOICE_REGISTRY_ADDRESS) {
        this.invoiceRegistry = new starknet.Contract(
          invoiceRegistryABI,
          process.env.INVOICE_REGISTRY_ADDRESS,
          this.account || this.provider
        );
      }

      if (process.env.ESCROW_CONTRACT_ADDRESS) {
        this.escrowContract = new starknet.Contract(
          escrowABI,
          process.env.ESCROW_CONTRACT_ADDRESS,
          this.account || this.provider
        );
      }

      this.initialized = true;
    } catch (error) {
      console.error('Contract initialization failed:', error);
      throw error;
    }
  }

  // Helper method to wait for transaction confirmation
  async waitForTransaction(txHash, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (receipt.status === 'ACCEPTED_ON_L2' || receipt.status === 'ACCEPTED_ON_L1') {
          return receipt;
        }
      } catch (error) {
        // Transaction might not be processed yet
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Transaction ${txHash} not confirmed within ${maxWaitTime}ms`);
  }

  async createInvoice(amount, description, escrowEnabled, expiryTimestamp) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const amountBN = starknet.bnToUint256(BigInt(amount * 1e18)); // Convert to wei-like units
      
      const tx = await this.invoiceRegistry.invoke(
        'createInvoice',
        [
          amountBN.low,
          amountBN.high,
          starknet.shortStringToFelt(description),
          escrowEnabled ? 1 : 0,
          starknet.bnToUint256(BigInt(expiryTimestamp)).low,
          starknet.bnToUint256(BigInt(expiryTimestamp)).high
        ]
      );

      // Wait for transaction confirmation
      const receipt = await this.waitForTransaction(tx.transaction_hash);

      return {
        transactionHash: tx.transaction_hash,
        blockNumber: receipt.block_number,
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async payInvoice(invoiceId, useEscrow = false) {
    if (!this.invoiceRegistry || !this.wbtcToken) {
      throw new Error('Contracts not initialized');
    }

    try {
      const invoiceIdBN = starknet.bnToUint256(BigInt(invoiceId));
      
      // First approve token transfer
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const approveTx = await this.wbtcToken.invoke(
        'approve',
        [
          process.env.INVOICE_REGISTRY_ADDRESS,
          invoice.amount.low,
          invoice.amount.high
        ]
      );

      // Then pay invoice
      const method = useEscrow ? 'payInvoiceWithEscrow' : 'payInvoice';
      const payTx = await this.invoiceRegistry.invoke(
        method,
        [invoiceIdBN.low, invoiceIdBN.high]
      );

      // Wait for transaction confirmation
      const receipt = await this.waitForTransaction(payTx.transaction_hash);

      return {
        transactionHash: payTx.transaction_hash,
        blockNumber: receipt.block_number,
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to pay invoice: ${error.message}`);
    }
  }

  async releaseEscrow(invoiceId) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const invoiceIdBN = starknet.bnToUint256(BigInt(invoiceId));
      
      const tx = await this.invoiceRegistry.invoke(
        'releaseEscrow',
        [invoiceIdBN.low, invoiceIdBN.high]
      );

      // Wait for transaction confirmation
      const receipt = await this.waitForTransaction(tx.transaction_hash);

      return {
        transactionHash: tx.transaction_hash,
        blockNumber: receipt.block_number,
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to release escrow: ${error.message}`);
    }
  }

  async getInvoice(invoiceId) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const invoiceIdBN = starknet.bnToUint256(BigInt(invoiceId));
      const result = await this.invoiceRegistry.call(
        'getInvoice',
        [invoiceIdBN.low, invoiceIdBN.high]
      );

      return {
        id: starknet.uint256ToBN(result.id.low, result.id.high).toString(),
        creator: '0x' + result.creator.toString(16),
        amount: {
          low: result.amount.low.toString(),
          high: result.amount.high.toString()
        },
        description: starknet.longStringToFelt(result.description),
        escrowEnabled: result.escrowEnabled,
        expiryTimestamp: starknet.uint256ToBN(result.expiryTimestamp.low, result.expiryTimestamp.high).toString(),
        status: result.status,
        createdAt: starknet.uint256ToBN(result.createdAt.low, result.createdAt.high).toString(),
        paidAt: starknet.uint256ToBN(result.paidAt.low, result.paidAt.high).toString()
      };
    } catch (error) {
      console.error('Failed to get invoice:', error);
      return null;
    }
  }

  async getBalance(address) {
    if (!this.wbtcToken) {
      throw new Error('WrappedBTC contract not initialized');
    }

    try {
      const result = await this.wbtcToken.call('balanceOf', [address]);
      const balance = starknet.uint256ToBN(result.balance.low, result.balance.high);
      return balance.toString();
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getInvoices(filter = {}) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const nextIdResult = await this.invoiceRegistry.call('getNextInvoiceId');
      const nextId = starknet.uint256ToBN(nextIdResult.id.low, nextIdResult.id.high).toNumber();
      const invoices = [];

      // Get all invoices up to current ID (in production, implement pagination)
      for (let i = 1; i < nextId; i++) {
        try {
          const invoice = await this.getInvoice(i);
          if (invoice) {
            // Apply filters
            if (filter.address && invoice.creator !== filter.address) {
              if (filter.type === 'created' || invoice.creator !== filter.address) continue;
            }
            if (filter.type === 'created' && invoice.creator !== filter.address) continue;
            if (filter.type === 'paid' && invoice.status !== 1) continue; // PAID = 1
            
            invoices.push(invoice);
          }
        } catch (error) {
          // Skip invalid invoices
        }
      }

      return invoices;
    } catch (error) {
      throw new Error(`Failed to get invoices: ${error.message}`);
    }
  }

  async getNextInvoiceId() {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const result = await this.invoiceRegistry.call('getNextInvoiceId');
      const nextId = starknet.uint256ToBN(result.id.low, result.id.high);
      return nextId.toString();
    } catch (error) {
      throw new Error(`Failed to get next invoice ID: ${error.message}`);
    }
  }

  // Complete WrappedBTC ABI
  getWrappedBTCABI() {
    return [
      {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [{"name": "res", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{"name": "res", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{"name": "res", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [{"name": "res", "type": "Uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "account", "type": "felt"}],
        "outputs": [{"name": "balance", "type": "Uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "allowance",
        "inputs": [
          {"name": "owner", "type": "felt"},
          {"name": "spender", "type": "felt"}
        ],
        "outputs": [{"name": "res", "type": "Uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          {"name": "recipient", "type": "felt"},
          {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "approve",
        "inputs": [
          {"name": "spender", "type": "felt"},
          {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "transferFrom",
        "inputs": [
          {"name": "sender", "type": "felt"},
          {"name": "recipient", "type": "felt"},
          {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "mint",
        "inputs": [
          {"name": "to", "type": "felt"},
          {"name": "amount", "type": "Uint256"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "getOwner",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      }
    ];
  }

  getInvoiceRegistryABI() {
    return [
      {
        "type": "function",
        "name": "createInvoice",
        "inputs": [
          {"name": "amount", "type": "Uint256"},
          {"name": "description", "type": "felt"},
          {"name": "escrowEnabled", "type": "felt"},
          {"name": "expiryTimestamp", "type": "Uint256"}
        ],
        "outputs": [{"name": "invoiceId", "type": "Uint256"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "getInvoice",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "invoice", "type": "Invoice"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getNextInvoiceId",
        "inputs": [],
        "outputs": [{"name": "id", "type": "Uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getWBTCAddress",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getEscrowAddress",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getOwner",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "payInvoice",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "payInvoiceWithEscrow",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "markInvoiceExpired",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "releaseEscrow",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      }
    ];
  }

  getEscrowABI() {
    return [
      {
        "type": "function",
        "name": "deposit",
        "inputs": [
          {"name": "invoiceId", "type": "Uint256"},
          {"name": "payer", "type": "felt"},
          {"name": "amount", "type": "Uint256"},
          {"name": "invoiceCreator", "type": "felt"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "release",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "refundAfterExpiry",
        "inputs": [
          {"name": "invoiceId", "type": "Uint256"},
          {"name": "refundee", "type": "felt"},
          {"name": "reason", "type": "felt"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "emergencyWithdraw",
        "inputs": [
          {"name": "invoiceId", "type": "Uint256"},
          {"name": "recipient", "type": "felt"}
        ],
        "outputs": [{"name": "success", "type": "felt"}],
        "stateMutability": "external"
      },
      {
        "type": "function",
        "name": "getEscrow",
        "inputs": [{"name": "invoiceId", "type": "Uint256"}],
        "outputs": [{"name": "escrow", "type": "EscrowEntry"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getWBTCAddress",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getInvoiceRegistryAddress",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getTotalEscrowed",
        "inputs": [],
        "outputs": [{"name": "amount", "type": "Uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getOwner",
        "inputs": [],
        "outputs": [{"name": "address", "type": "felt"}],
        "stateMutability": "view"
      }
    ];
  }
}

module.exports = new ContractService();