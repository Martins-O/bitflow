import { useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Notification } from '@/components/Notification'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useWallet } from '@/hooks/useWallet'
import { useNotification } from '@/hooks/useNotification'
import type { NotificationType, LayoutContext } from '@/types'

export function RootLayout() {
  const { connected, address, loading: walletLoading, toggle } = useWallet()
  const { notification, show: showNotification, hide: hideNotification } = useNotification()
  const [globalLoading, setGlobalLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()

  const refreshDashboard = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const notify = useCallback(
    (msg: string, type: NotificationType) => showNotification(msg, type),
    [showNotification],
  )

  const handleToggleWallet = useCallback(async () => {
    try {
      await toggle()
      showNotification(
        connected ? 'Wallet disconnected' : 'Wallet connected successfully',
        connected ? 'info' : 'success',
      )
      if (!connected) refreshDashboard()
    } catch (err) {
      showNotification((err as Error).message, 'error')
    }
  }, [toggle, connected, showNotification, refreshDashboard])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        hideNotification()
        return
      }
      if (!(e.ctrlKey || e.metaKey)) return

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          navigate('/create')
          setTimeout(() => document.getElementById('amount')?.focus(), 50)
          break
        case 'p':
          e.preventDefault()
          navigate('/pay')
          setTimeout(() => document.getElementById('invoiceId')?.focus(), 50)
          break
        case 'r':
          e.preventDefault()
          refreshDashboard()
          showNotification('Dashboard refreshed', 'info')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hideNotification, refreshDashboard, showNotification, navigate])

  // Refresh dashboard when tab becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && connected) refreshDashboard()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [connected, refreshDashboard])

  const context: LayoutContext = {
    connected,
    address,
    notify,
    setGlobalLoading,
    refreshDashboard,
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-dark-tertiary text-bitcoin-orange px-4 py-2 rounded-lg z-50 font-semibold">
        Skip to main content
      </a>

      <Header
        connected={connected}
        address={address}
        loading={walletLoading}
        onToggleWallet={handleToggleWallet}
      />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 min-h-[calc(100vh-200px)]">
        <Outlet context={{ ...context, refreshKey }} />
      </main>

      <Footer />

      <Notification notification={notification} onClose={hideNotification} />
      <LoadingOverlay visible={globalLoading} />
    </>
  )
}
