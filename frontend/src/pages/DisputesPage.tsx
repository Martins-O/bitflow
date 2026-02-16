import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, formatAmount, formatTimestamp, formatAddress } from '@/services/api'
import { wallet } from '@/services/wallet'
import { StatusBadge } from '@/components/StatusBadge'
import { DisputeBadge } from '@/components/DisputeBadge'
import type { Invoice, LayoutContext } from '@/types'

export function DisputesPage() {
  const { connected, address, notify, setGlobalLoading } = useOutletContext<LayoutContext & { refreshKey: number }>()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadDisputes = useCallback(async () => {
    if (!connected) {
      setInvoices([])
      return
    }

    setLoading(true)
    try {
      const data = await api.getInvoices({ type: 'disputed' })
      setInvoices(data)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [connected])

  useEffect(() => {
    void loadDisputes()
  }, [loadDisputes])

  async function handleResolve(invoice: Invoice, winner: 'creator' | 'payer') {
    const winnerAddress = winner === 'creator' ? invoice.merchantAddress : invoice.payerAddress
    if (!winnerAddress) {
      notify('Winner address not available', 'error')
      return
    }

    if (!window.confirm(`Resolve dispute in favor of the ${winner}?`)) return

    setActionLoading(invoice.id)
    setGlobalLoading(true)
    try {
      const result = await wallet.resolveDispute(invoice.id, winnerAddress)
      notify(`Dispute resolved! Tx: ${result.transactionHash.slice(0, 10)}...`, 'success')
      void loadDisputes()
    } catch (err) {
      const msg = (err as Error).message
      notify(msg.includes('User abort') || msg.includes('rejected') ? 'Transaction rejected' : msg, 'error')
    } finally {
      setActionLoading(null)
      setGlobalLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Dispute Resolution</h2>
          <p className="text-sm text-gray-400 mt-1">Review and resolve disputed invoices</p>
        </div>
        <button
          onClick={() => void loadDisputes()}
          disabled={loading}
          className="px-4 py-2 bg-dark-tertiary text-gray-300 border border-white/10 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all duration-200 disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {!connected ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500">Connect your wallet to view disputed invoices.</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-200 mb-2">No Active Disputes</h3>
          <p className="text-gray-500 text-sm">All invoices are in good standing.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="glass-card p-6 border-amber-500/10 animate-fade-in"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg font-bold text-gray-200">#{inv.id}</span>
                    <StatusBadge status={inv.status} />
                    {inv.isDisputed && <DisputeBadge isDisputed={true} />}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Amount</span>
                      <p className="text-bitcoin-orange font-bold">{formatAmount(inv.amount)} BTC</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Description</span>
                      <p className="text-gray-300 truncate">{inv.description}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Creator</span>
                      <p className="text-gray-400 font-mono text-xs">{inv.merchantAddress ? formatAddress(inv.merchantAddress) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Payer</span>
                      <p className="text-gray-400 font-mono text-xs">{inv.payerAddress ? formatAddress(inv.payerAddress) : '-'}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Created: {formatTimestamp(inv.createdAt)}</span>
                    <span>Expires: {formatTimestamp(inv.expiryTimestamp)}</span>
                  </div>
                </div>

                {inv.isDisputed && inv.status !== 'RESOLVED' && (
                  <div className="flex flex-col gap-2 md:min-w-[200px]">
                    <button
                      onClick={() => handleResolve(inv, 'creator')}
                      disabled={actionLoading === inv.id}
                      className="px-4 py-2.5 bg-success-gradient text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:transform-none"
                    >
                      {actionLoading === inv.id ? 'Processing...' : 'Award Creator'}
                    </button>
                    <button
                      onClick={() => handleResolve(inv, 'payer')}
                      disabled={actionLoading === inv.id}
                      className="px-4 py-2.5 bg-orange-gradient text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:transform-none"
                    >
                      {actionLoading === inv.id ? 'Processing...' : 'Refund Payer'}
                    </button>
                  </div>
                )}

                {inv.status === 'RESOLVED' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Resolved
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
