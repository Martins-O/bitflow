import type { AccountInterface } from 'starknet'

declare global {
  interface Window {
    starknet?: {
      enable: () => Promise<string[]>
      isConnected: boolean
      account: AccountInterface
      selectedAddress: string
      name?: string
      on: (event: string, handler: (accounts: string[]) => void) => void
      off: (event: string, handler: (accounts: string[]) => void) => void
    }
    starknet_argentX?: any
    starknet_braavos?: any
  }
}

export { }
