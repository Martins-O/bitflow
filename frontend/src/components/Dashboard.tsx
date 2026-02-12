import { useState, useEffect, useCallback } from 'react'
import { api, formatAmount, formatTimestamp } from '@/services/api'
import { Section } from './Section'
import { StatusBadge } from './StatusBadge'
import { DisputeBadge } from './DisputeBadge'
import type { Invoice, NotificationType } from '@/types'

interface Props {
  connected: boolean
  address: string | null
  refreshKey: number
  onNotify: (msg: string, type: NotificationType) => void
  onLoading: (v: boolean) => void
}

const statusAccent: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-emerald-500',
  RELEASED: 'bg-teal-400',
  EXPIRED: 'bg-red-500',
}

export function Dashboard({ connected, address, refreshKey, onNotify, onLoading }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState('')

  const loadInvoices = useCallback(async () => {
    if (!connected) {
      setInvoices([])
      return
    }

    try {
      const params: Record<string, string> = {}
      if (filter && address) {
        params.address = address
        params.type = filter
      }
      const data = await api.getInvoices(params)
      setInvoices(data)
    } catch {
      setInvoices([])
    }
  }, [connected, address, filter])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices, refreshKey])

  async function handleRelease(invoiceId: string) {
    if (!window.confirm('Release the escrow funds for this invoice?')) return

    onLoading(true)
    try {
      await api.releaseEscrow(invoiceId)
      onNotify('Escrow released successfully!', 'success')
      void loadInvoices()
    } catch (err) {
      onNotify((err as Error).message, 'error')
    } finally {
      onLoading(false)
    }
  }

  return (
    <Section id="dashboard" title="Invoice Dashboard">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Invoices</option>
          <option value="created">My Created</option>
          <option value="paid">My Paid</option>
          <option value="disputed">Disputed</option>
        </select>
        <button
          onClick={() => void loadInvoices()}
          className="px-4 py-2 bg-dark-tertiary text-gray-300 border border-white/10 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all duration-200"
        >
          Refresh
        </button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          {connected
            ? 'No invoices found.'
            : 'Connect your wallet to view invoices.'}
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((inv, i) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              index={i}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}
    </Section>
  )
}

function InvoiceCard({
  invoice,
  index,
  onRelease,
}: {
  invoice: Invoice
  index: number
  onRelease: (id: string) => void
}) {
  return (
    <div
      className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden animate-fade-in group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Status accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${statusAccent[invoice.status] ?? 'bg-gray-500'}`} />

      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-gray-200 text-lg">#{invoice.id}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.isDisputed && <DisputeBadge isDisputed={true} />}
        </div>
      </div>

      <p className="text-2xl font-bold text-bitcoin-orange mb-3">
        {formatAmount(invoice.amount)} <span className="text-sm text-gray-500">BTC</span>
      </p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2.5 bg-dark-tertiary/60 rounded-lg border border-white/5">
          <span className="text-gray-500 text-xs">Description</span>
          <p className="text-gray-300 truncate">{invoice.description}</p>
        </div>
        <div className="p-2.5 bg-dark-tertiary/60 rounded-lg border border-white/5">
          <span className="text-gray-500 text-xs">Created</span>
          <p className="text-gray-400 text-xs font-mono">
            {formatTimestamp(invoice.createdAt)}
          </p>
        </div>
        <div className="p-2.5 bg-dark-tertiary/60 rounded-lg border border-white/5">
          <span className="text-gray-500 text-xs">Expires</span>
          <p className="text-gray-400 text-xs font-mono">
            {formatTimestamp(invoice.expiryTimestamp)}
          </p>
        </div>
        {invoice.escrowEnabled && (
          <div className="p-2.5 bg-dark-tertiary/60 rounded-lg border border-white/5">
            <span className="text-gray-500 text-xs">Escrow</span>
            <p className="text-emerald-400 text-xs font-semibold">Enabled</p>
          </div>
        )}
      </div>

      {invoice.status === 'PAID' && invoice.escrowEnabled && (
        <button
          onClick={() => onRelease(invoice.id)}
          className="btn-success mt-4 w-full text-sm"
        >
          Release Escrow
        </button>
      )}
    </div>
  )
}
