import { RpcProvider, shortString, uint256, type AccountInterface, type Call } from 'starknet'
import type { WalletInfo } from '@/types'

const RPC_URL =
  import.meta.env.VITE_STARKNET_RPC ||
  'https://starknet-sepolia.public.blastapi.io'

const INVOICE_REGISTRY_ADDRESS = import.meta.env.VITE_INVOICE_REGISTRY_ADDRESS || ''
const WBTC_TOKEN_ADDRESS = import.meta.env.VITE_WBTC_TOKEN_ADDRESS || ''

export interface StarknetWallet {
  id: string
  name: string
  icon?: string
}

function amountToWei(amount: number): bigint {
  const parts = String(amount).split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(18, '0').slice(0, 18)
  return BigInt(whole) * BigInt('1000000000000000000') + BigInt(frac)
}

class WalletService {
  connected = false
  account: AccountInterface | null = null
  address: string | null = null
  provider: RpcProvider | null = null
  currentWallet: string | null = null

  private accountsChangedHandler: ((accounts: string[]) => void) | null = null

  detectWallets(): StarknetWallet[] {
    const wallets: StarknetWallet[] = []

    if (window.starknet_argentX) {
      wallets.push({
        id: 'argentX',
        name: 'Argent X',
        icon: '🔷'
      })
    }

    if (window.starknet_braavos) {
      wallets.push({
        id: 'braavos',
        name: 'Braavos',
        icon: '🦁'
      })
    }

    if (window.starknet && !wallets.length) {
      wallets.push({
        id: 'starknet',
        name: window.starknet.name || 'Starknet Wallet',
        icon: '⚡'
      })
    }

    return wallets
  }

  hasStarknetWallet(): boolean {
    return !!(window.starknet || window.starknet_argentX || window.starknet_braavos)
  }

  async connect(walletId?: string): Promise<WalletInfo> {
    let walletProvider = window.starknet

    if (walletId === 'argentX' && window.starknet_argentX) {
      walletProvider = window.starknet_argentX
    } else if (walletId === 'braavos' && window.starknet_braavos) {
      walletProvider = window.starknet_braavos
    }

    if (!walletProvider) {
      throw new Error(
        'Starknet wallet not found. Please install ArgentX or Braavos wallet extension.',
      )
    }

    await walletProvider.enable()

    if (!walletProvider.isConnected || !walletProvider.account) {
      throw new Error('Failed to connect wallet. Please try again.')
    }

    this.account = walletProvider.account
    this.address = walletProvider.selectedAddress
    this.connected = true
    this.currentWallet = walletId || 'starknet'
    this.provider = new RpcProvider({ nodeUrl: RPC_URL })

    this.accountsChangedHandler = this.handleAccountsChanged.bind(this)
    walletProvider.on('accountsChanged', this.accountsChangedHandler)

    return {
      connected: true,
      address: this.address,
      wallet: walletProvider.name || 'Unknown Wallet',
    }
  }

  disconnect(): void {
    const walletProvider = this.getWalletProvider()

    if (walletProvider?.off && this.accountsChangedHandler) {
      walletProvider.off('accountsChanged', this.accountsChangedHandler)
    }

    this.connected = false
    this.account = null
    this.address = null
    this.provider = null
    this.currentWallet = null
    this.accountsChangedHandler = null
  }

  isConnected(): boolean {
    const walletProvider = this.getWalletProvider()
    if (!walletProvider) return false
    return walletProvider.isConnected && !!walletProvider.selectedAddress
  }

  private getWalletProvider() {
    if (this.currentWallet === 'argentX') return window.starknet_argentX
    if (this.currentWallet === 'braavos') return window.starknet_braavos
    return window.starknet
  }

  private ensureConnected(): AccountInterface {
    if (!this.connected || !this.account) {
      throw new Error('Wallet not connected')
    }
    return this.account
  }

  async createInvoice(
    amount: number,
    description: string,
    escrowEnabled: boolean,
    expiryTimestamp: number,
  ): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const amountWei = amountToWei(amount)
    const amountU256 = uint256.bnToUint256(amountWei)
    const desc = description.slice(0, 31)
    const expiryU256 = uint256.bnToUint256(BigInt(expiryTimestamp))

    const result = await account.execute({
      contractAddress: INVOICE_REGISTRY_ADDRESS,
      entrypoint: 'createInvoice',
      calldata: [
        amountU256.low.toString(),
        amountU256.high.toString(),
        shortString.encodeShortString(desc),
        escrowEnabled ? '1' : '0',
        expiryU256.low.toString(),
        expiryU256.high.toString(),
      ],
    })

    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  async payInvoice(
    invoiceId: string,
    amountLow: string,
    amountHigh: string,
    useEscrow: boolean,
  ): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId))

    // Multicall: approve WBTC transfer + pay invoice in a single transaction
    const calls: Call[] = [
      {
        contractAddress: WBTC_TOKEN_ADDRESS,
        entrypoint: 'approve',
        calldata: [
          INVOICE_REGISTRY_ADDRESS,
          amountLow,
          amountHigh,
        ],
      },
      {
        contractAddress: INVOICE_REGISTRY_ADDRESS,
        entrypoint: useEscrow ? 'payInvoiceWithEscrow' : 'payInvoice',
        calldata: [
          invoiceIdU256.low.toString(),
          invoiceIdU256.high.toString(),
        ],
      },
    ]

    const result = await account.execute(calls)
    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  async releaseEscrow(invoiceId: string): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId))

    const result = await account.execute({
      contractAddress: INVOICE_REGISTRY_ADDRESS,
      entrypoint: 'releaseEscrow',
      calldata: [
        invoiceIdU256.low.toString(),
        invoiceIdU256.high.toString(),
      ],
    })

    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  async disputeInvoice(invoiceId: string): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId))

    const result = await account.execute({
      contractAddress: INVOICE_REGISTRY_ADDRESS,
      entrypoint: 'dispute_invoice',
      calldata: [
        invoiceIdU256.low.toString(),
        invoiceIdU256.high.toString(),
      ],
    })

    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  async resolveDispute(
    invoiceId: string,
    winnerAddress: string,
  ): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const invoiceIdU256 = uint256.bnToUint256(BigInt(invoiceId))

    const result = await account.execute({
      contractAddress: INVOICE_REGISTRY_ADDRESS,
      entrypoint: 'resolve_dispute',
      calldata: [
        invoiceIdU256.low.toString(),
        invoiceIdU256.high.toString(),
        winnerAddress,
      ],
    })

    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  async sendTransaction(
    contractAddress: string,
    entrypoint: string,
    calldata: string[],
  ): Promise<{ transactionHash: string }> {
    const account = this.ensureConnected()

    const result = await account.execute({
      contractAddress,
      entrypoint,
      calldata,
    })

    await this.waitForTransaction(result.transaction_hash)
    return { transactionHash: result.transaction_hash }
  }

  private async waitForTransaction(txHash: string): Promise<void> {
    if (!this.provider) throw new Error('Provider not initialized')

    const maxRetries = 30
    const delay = 5000

    for (let i = 0; i < maxRetries; i++) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash)
        const finality = (receipt as Record<string, unknown>).finality_status as string | undefined
        const execution = (receipt as Record<string, unknown>).execution_status as string | undefined
        if (
          finality === 'ACCEPTED_ON_L1' ||
          finality === 'ACCEPTED_ON_L2' ||
          execution === 'SUCCEEDED'
        ) {
          return
        }
      } catch {
        // Transaction might not be processed yet
      }
      await new Promise((r) => setTimeout(r, delay))
    }

    throw new Error('Transaction confirmation timeout')
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (!accounts || accounts.length === 0) {
      this.connected = false
      this.account = null
      this.address = null
      window.dispatchEvent(new CustomEvent('walletDisconnected'))
    } else {
      this.address = accounts[0]!
      window.dispatchEvent(
        new CustomEvent('accountChanged', { detail: { address: accounts[0] } }),
      )
    }
  }
}

export const wallet = new WalletService()
