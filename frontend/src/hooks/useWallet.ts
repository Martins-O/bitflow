import { useState, useCallback, useEffect } from 'react'
import { wallet } from '@/services/wallet'
import type { WalletInfo } from '@/types'

export function useWallet() {
  const [connected, setConnected] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const connect = useCallback(async (walletId?: string) => {
    setLoading(true)
    try {
      const info = await wallet.connect(walletId)
      setWalletInfo(info)
      setConnected(true)
      return info
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    wallet.disconnect()
    setWalletInfo(null)
    setConnected(false)
  }, [])

  const toggle = useCallback(async () => {
    if (connected) {
      disconnect()
    } else {
      await connect()
    }
  }, [connected, connect, disconnect])

  // Auto-reconnect on mount if wallet was previously connected
  useEffect(() => {
    if (wallet.isConnected()) {
      connect().catch(() => {
        // Wallet not available
      })
    }
  }, [connect])

  // Listen for external wallet events
  useEffect(() => {
    const handleDisconnect = () => {
      setConnected(false)
      setWalletInfo(null)
    }

    const handleAccountChange = (e: Event) => {
      const detail = (e as CustomEvent<{ address: string }>).detail
      setWalletInfo((prev) =>
        prev ? { ...prev, address: detail.address } : null,
      )
    }

    window.addEventListener('walletDisconnected', handleDisconnect)
    window.addEventListener('accountChanged', handleAccountChange)

    return () => {
      window.removeEventListener('walletDisconnected', handleDisconnect)
      window.removeEventListener('accountChanged', handleAccountChange)
    }
  }, [])

  return {
    connected,
    walletInfo,
    loading,
    address: wallet.address,
    connect,
    disconnect,
    toggle,
  }
}
