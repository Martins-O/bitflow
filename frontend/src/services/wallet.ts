import { RpcProvider, type AccountInterface } from 'starknet'
import type { WalletInfo } from '@/types'

const RPC_URL =
  import.meta.env.VITE_STARKNET_RPC ||
  'https://starknet-sepolia.public.blastapi.io'

export interface StarknetWallet {
  id: string
  name: string
  icon?: string
}

class WalletService {
  connected = false
  account: AccountInterface | null = null
  address: string | null = null
  provider: RpcProvider | null = null
  currentWallet: string | null = null

  private accountsChangedHandler: ((accounts: string[]) => void) | null = null

  // Detect available Starknet wallets
  detectWallets(): StarknetWallet[] {
    const wallets: StarknetWallet[] = []

    // Check for ArgentX
    if (window.starknet_argentX) {
      wallets.push({
        id: 'argentX',
        name: 'Argent X',
        icon: '🔷'
      })
    }

    // Check for Braavos
    if (window.starknet_braavos) {
      wallets.push({
        id: 'braavos',
        name: 'Braavos',
        icon: '🦁'
      })
    }

    // Check for generic starknet (could be either)
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
    // Select the appropriate wallet
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

  async sendTransaction(
    contractAddress: string,
    entrypoint: string,
    calldata: string[],
  ): Promise<{ transactionHash: string }> {
    if (!this.connected || !this.account) {
      throw new Error('Wallet not connected')
    }

    const result = await this.account.execute({
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
