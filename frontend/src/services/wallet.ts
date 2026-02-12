import { RpcProvider, type AccountInterface } from 'starknet'
import type { WalletInfo } from '@/types'

const RPC_URL =
  import.meta.env.VITE_STARKNET_RPC ||
  'https://starknet-sepolia.public.blastapi.io'

class WalletService {
  connected = false
  account: AccountInterface | null = null
  address: string | null = null
  provider: RpcProvider | null = null

  private accountsChangedHandler: ((accounts: string[]) => void) | null = null

  async connect(): Promise<WalletInfo> {
    if (!window.starknet) {
      throw new Error(
        'Starknet wallet not found. Please install Argent or Braavos wallet.',
      )
    }

    await window.starknet.enable()

    if (!window.starknet.isConnected || !window.starknet.account) {
      throw new Error('Failed to connect wallet. Please try again.')
    }

    this.account = window.starknet.account
    this.address = window.starknet.selectedAddress
    this.connected = true
    this.provider = new RpcProvider({ nodeUrl: RPC_URL })

    this.accountsChangedHandler = this.handleAccountsChanged.bind(this)
    window.starknet.on('accountsChanged', this.accountsChangedHandler)

    return {
      connected: true,
      address: this.address,
      wallet: window.starknet.name || 'Unknown Wallet',
    }
  }

  disconnect(): void {
    if (window.starknet?.off && this.accountsChangedHandler) {
      window.starknet.off('accountsChanged', this.accountsChangedHandler)
    }

    this.connected = false
    this.account = null
    this.address = null
    this.provider = null
    this.accountsChangedHandler = null
  }

  isConnected(): boolean {
    if (!window.starknet) return false
    return window.starknet.isConnected && !!window.starknet.selectedAddress
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
