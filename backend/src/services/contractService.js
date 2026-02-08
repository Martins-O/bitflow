const { RpcProvider, Account, Contract, uint256, shortString } = require('starknet');

// Convert a decimal amount string to BigInt wei (avoids floating point errors)
function amountToWei (amount) {
  const parts = String(amount).split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(18, '0').slice(0, 18);
  return BigInt(whole) * BigInt('1000000000000000000') + BigInt(frac);
}

// Convert BigInt wei back to decimal string
function weiToAmount (wei) {
  const str = wei.toString().padStart(19, '0');
  const whole = str.slice(0, str.length - 18) || '0';
  const frac = str.slice(str.length - 18).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

class ContractService {
  constructor () {
    this.provider = null;
    this.account = null;
    this.wbtcToken = null;
    this.invoiceRegistry = null;
    this.escrowContract = null;
    this.initialized = false;
  }

  initialize () {
    if (this.initialized) return;

    try {
      this.provider = new RpcProvider({
        nodeUrl: process.env.RPC_URL || 'https://starknet-sepolia.infura.io/v3/YOUR_INFURA_KEY'
      });

      if (process.env.PRIVATE_KEY && process.env.ACCOUNT_ADDRESS) {
        this.account = new Account(
          this.provider,
          process.env.ACCOUNT_ADDRESS,
          process.env.PRIVATE_KEY
        );
      }

      const wbtcABI = this.getWrappedBTCABI();
      const invoiceRegistryABI = this.getInvoiceRegistryABI();
      const escrowABI = this.getEscrowABI();

      if (process.env.WBTC_TOKEN_ADDRESS) {
        this.wbtcToken = new Contract(
          wbtcABI,
          process.env.WBTC_TOKEN_ADDRESS,
          this.account || this.provider
        );
      }

      if (process.env.INVOICE_REGISTRY_ADDRESS) {
        this.invoiceRegistry = new Contract(
          invoiceRegistryABI,
          process.env.INVOICE_REGISTRY_ADDRESS,
          this.account || this.provider
        );
      }

      if (process.env.ESCROW_CONTRACT_ADDRESS) {
        this.escrowContract = new Contract(
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

  async waitForTransaction (txHash, maxWaitTime = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        // starknet.js v5+: check execution_status / finality_status
        if (receipt.execution_status === 'SUCCEEDED' ||
            receipt.finality_status === 'ACCEPTED_ON_L2' ||
            receipt.finality_status === 'ACCEPTED_ON_L1' ||
            receipt.status === 'ACCEPTED_ON_L2' ||
            receipt.status === 'ACCEPTED_ON_L1') {
          return receipt;
        }
        if (receipt.execution_status === 'REVERTED') {
          throw new Error(`Transaction ${txHash} reverted`);
        }
      } catch (error) {
        if (error.message.includes('reverted')) throw error;
        // Transaction might not be processed yet
      }

      await new Promise(resolve => { setTimeout(resolve, 2000); });
    }

    throw new Error(`Transaction ${txHash} not confirmed within ${maxWaitTime}ms`);
  }

  async createInvoice (amount, description, escrowEnabled, expiryTimestamp) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const amountWei = amountToWei(amount);
      const amountU256 = uint256.bnToUint256(amountWei);

      // Truncate description to 31 bytes for shortString felt encoding
      const desc = String(description).slice(0, 31);
      const expiryU256 = uint256.bnToUint256(BigInt(expiryTimestamp));

      const tx = await this.invoiceRegistry.invoke(
        'createInvoice',
        [
          amountU256.low,
          amountU256.high,
          shortString.encodeShortString(desc),
          escrowEnabled ? 1 : 0,
          expiryU256.low,
          expiryU256.high
        ]
      );

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

  async payInvoice (invoiceId, useEscrow = false) {
    if (!this.invoiceRegistry || !this.wbtcToken) {
      throw new Error('Contracts not initialized');
    }

    try {
      const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId));

      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Approve token transfer and wait for confirmation before paying
      const approveTx = await this.wbtcToken.invoke(
        'approve',
        [
          process.env.INVOICE_REGISTRY_ADDRESS,
          invoice.amount.low,
          invoice.amount.high
        ]
      );
      await this.waitForTransaction(approveTx.transaction_hash);

      const method = useEscrow ? 'payInvoiceWithEscrow' : 'payInvoice';
      const payTx = await this.invoiceRegistry.invoke(
        method,
        [invoiceIdU256.low, invoiceIdU256.high]
      );

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

  async releaseEscrow (invoiceId) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId));

      const tx = await this.invoiceRegistry.invoke(
        'releaseEscrow',
        [invoiceIdU256.low, invoiceIdU256.high]
      );

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

  async getInvoice (invoiceId) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId));
      const result = await this.invoiceRegistry.call(
        'getInvoice',
        [invoiceIdU256.low, invoiceIdU256.high]
      );

      return {
        id: uint256.uint256ToBN(result.id).toString(),
        creator: `0x${result.creator.toString(16)}`,
        amount: {
          low: result.amount.low.toString(),
          high: result.amount.high.toString()
        },
        description: shortString.decodeShortString(result.description.toString()),
        escrowEnabled: result.escrowEnabled,
        expiryTimestamp: uint256.uint256ToBN(result.expiryTimestamp).toString(),
        status: Number(result.status),
        createdAt: uint256.uint256ToBN(result.createdAt).toString(),
        paidAt: uint256.uint256ToBN(result.paidAt).toString()
      };
    } catch (error) {
      console.error(`Failed to get invoice ${invoiceId}:`, error.message);
      return null;
    }
  }

  async getBalance (address) {
    if (!this.wbtcToken) {
      throw new Error('WrappedBTC contract not initialized');
    }

    try {
      const result = await this.wbtcToken.call('balanceOf', [address]);
      const balance = uint256.uint256ToBN(result.balance);
      return balance.toString();
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async getInvoices (filter = {}) {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const nextIdResult = await this.invoiceRegistry.call('getNextInvoiceId');
      const nextId = Number(uint256.uint256ToBN(nextIdResult.id));
      const allInvoices = [];

      for (let i = 1; i < nextId; i++) {
        try {
          const invoice = await this.getInvoice(i);
          if (!invoice) continue;

          // Apply filters
          if (filter.type === 'created' && filter.address && invoice.creator !== filter.address) {
            continue;
          }
          if (filter.type === 'paid' && invoice.status !== 1) {
            continue;
          }
          if (filter.address && !filter.type && invoice.creator !== filter.address) {
            continue;
          }

          allInvoices.push(invoice);
        } catch (error) {
          // Skip invalid invoices
        }
      }

      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || allInvoices.length;
      return allInvoices.slice(offset, offset + limit);
    } catch (error) {
      throw new Error(`Failed to get invoices: ${error.message}`);
    }
  }

  async getNextInvoiceId () {
    if (!this.invoiceRegistry) {
      throw new Error('InvoiceRegistry contract not initialized');
    }

    try {
      const result = await this.invoiceRegistry.call('getNextInvoiceId');
      const nextId = uint256.uint256ToBN(result.id);
      return nextId.toString();
    } catch (error) {
      throw new Error(`Failed to get next invoice ID: ${error.message}`);
    }
  }

  // Complete WrappedBTC ABI
  getWrappedBTCABI () {
    return [
      {
        type: 'function',
        name: 'name',
        inputs: [],
        outputs: [{ name: 'res', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'symbol',
        inputs: [],
        outputs: [{ name: 'res', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: 'res', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [{ name: 'res', type: 'Uint256' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'felt' }],
        outputs: [{ name: 'balance', type: 'Uint256' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'felt' },
          { name: 'spender', type: 'felt' }
        ],
        outputs: [{ name: 'res', type: 'Uint256' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'recipient', type: 'felt' },
          { name: 'amount', type: 'Uint256' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'felt' },
          { name: 'amount', type: 'Uint256' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'transferFrom',
        inputs: [
          { name: 'sender', type: 'felt' },
          { name: 'recipient', type: 'felt' },
          { name: 'amount', type: 'Uint256' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'mint',
        inputs: [
          { name: 'to', type: 'felt' },
          { name: 'amount', type: 'Uint256' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      }
    ];
  }

  getInvoiceRegistryABI () {
    return [
      {
        type: 'function',
        name: 'createInvoice',
        inputs: [
          { name: 'amount', type: 'Uint256' },
          { name: 'description', type: 'felt' },
          { name: 'escrowEnabled', type: 'felt' },
          { name: 'expiryTimestamp', type: 'Uint256' }
        ],
        outputs: [{ name: 'invoiceId', type: 'Uint256' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'getInvoice',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'invoice', type: 'Invoice' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getNextInvoiceId',
        inputs: [],
        outputs: [{ name: 'id', type: 'Uint256' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getWBTCAddress',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getEscrowAddress',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'payInvoice',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'payInvoiceWithEscrow',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'markInvoiceExpired',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'releaseEscrow',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      }
    ];
  }

  getEscrowABI () {
    return [
      {
        type: 'function',
        name: 'deposit',
        inputs: [
          { name: 'invoiceId', type: 'Uint256' },
          { name: 'payer', type: 'felt' },
          { name: 'amount', type: 'Uint256' },
          { name: 'invoiceCreator', type: 'felt' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'release',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'refundAfterExpiry',
        inputs: [
          { name: 'invoiceId', type: 'Uint256' },
          { name: 'refundee', type: 'felt' },
          { name: 'reason', type: 'felt' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'emergencyWithdraw',
        inputs: [
          { name: 'invoiceId', type: 'Uint256' },
          { name: 'recipient', type: 'felt' }
        ],
        outputs: [{ name: 'success', type: 'felt' }],
        stateMutability: 'external'
      },
      {
        type: 'function',
        name: 'getEscrow',
        inputs: [{ name: 'invoiceId', type: 'Uint256' }],
        outputs: [{ name: 'escrow', type: 'EscrowEntry' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getWBTCAddress',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getInvoiceRegistryAddress',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getTotalEscrowed',
        inputs: [],
        outputs: [{ name: 'amount', type: 'Uint256' }],
        stateMutability: 'view'
      },
      {
        type: 'function',
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'address', type: 'felt' }],
        stateMutability: 'view'
      }
    ];
  }
}

const instance = new ContractService();
instance.weiToAmount = weiToAmount;
instance.amountToWei = amountToWei;
module.exports = instance;
