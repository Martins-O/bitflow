import { useState, useEffect, useCallback, useMemo } from 'react'
import { api, formatAmount, formatTimestamp, invalidateInvoiceCache } from '@/services/api'
import { wallet } from '@/services/wallet'
import { Section } from './Section'
import { StatusBadge } from './StatusBadge'
import { DisputeBadge } from './DisputeBadge'
import { InvoiceStats } from './dashboard/InvoiceStats'
import { InvoiceFilters, type InvoiceFilterOptions } from './dashboard/InvoiceFilters'
import { InvoiceTable } from './dashboard/InvoiceTable'
import { ViewToggle } from './dashboard/ViewToggle'
import { InvoiceDetailModal } from './dashboard/InvoiceDetailModal'
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

const initialFilters: InvoiceFilterOptions = {
  status: 'all',
  type: 'all',
  search: '',
  escrowOnly: false,
  dateRange: { start: '', end: '' },
  amountRange: { min: '', max: '' },
}

export function Dashboard({ connected, address, refreshKey, onNotify, onLoading }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filters, setFilters] = useState<InvoiceFilterOptions>(initialFilters)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const loadInvoices = useCallback(async () => {
    if (!connected) {
      setInvoices([])
      return
    }

    try {
      const params: Record<string, string> = {}
      if (filters.type !== 'all' && address) {
        params.address = address
        params.type = filters.type
      }
      const data = await api.getInvoices(params)
      setInvoices(data)
    } catch {
      setInvoices([])
    }
  }, [connected, address, filters.type])

  useEffect(() => {
    void loadInvoices()
  }, [loadInvoices, refreshKey])

  // Apply client-side filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Status filter
      if (filters.status !== 'all' && invoice.status !== filters.status) {
        return false
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesId = invoice.id.toLowerCase().includes(searchLower)
        const matchesDesc = invoice.description.toLowerCase().includes(searchLower)
        if (!matchesId && !matchesDesc) return false
      }

      // Escrow filter
      if (filters.escrowOnly && !invoice.escrowEnabled) {
        return false
      }

      // Date range filter
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start).getTime() / 1000
        if (invoice.createdAt < startDate) return false
      }
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end).getTime() / 1000
        if (invoice.createdAt > endDate) return false
      }

      // Amount range filter
      if (filters.amountRange.min) {
        const minAmount = parseFloat(filters.amountRange.min)
        if (parseFloat(invoice.amount) < minAmount) return false
      }
      if (filters.amountRange.max) {
        const maxAmount = parseFloat(filters.amountRange.max)
        if (parseFloat(invoice.amount) > maxAmount) return false
      }

      return true
    })
  }, [invoices, filters])

  async function handleRelease(invoiceId: string) {
    if (!window.confirm('Release the escrow funds for this invoice?')) return

    onLoading(true)
    try {
      await wallet.releaseEscrow(invoiceId)
      invalidateInvoiceCache(invoiceId)
      onNotify('Escrow released successfully!', 'success')
      void loadInvoices()
    } catch (err) {
      onNotify((err as Error).message, 'error')
    } finally {
      onLoading(false)
    }
  }

  const handleResetFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <Section id="dashboard" title="Invoice Dashboard">
      {/* Statistics */}
      {connected && invoices.length > 0 && <InvoiceStats invoices={invoices} />}

      {/* Filters */}
      {connected && (
        <InvoiceFilters
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
        />
      )}

      {/* View Toggle and Refresh */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        {connected && filteredInvoices.length > 0 && (
          <ViewToggle view={view} onViewChange={setView} />
        )}
        <div className="flex-1" />
        <button
          onClick={() => void loadInvoices()}
          className="px-4 py-2 bg-dark-tertiary text-gray-300 border border-white/10 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all duration-200"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Content */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          {!connected ? (
            <div className="space-y-3">
              <div className="text-6xl">🔌</div>
              <p className="text-gray-400 text-lg">Connect your wallet to view invoices</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="space-y-3">
              <div className="text-6xl">📋</div>
              <p className="text-gray-400 text-lg">No invoices found</p>
              <p className="text-gray-500 text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-6xl">🔍</div>
              <p className="text-gray-400 text-lg">No invoices match your filters</p>
              <button
                onClick={handleResetFilters}
                className="text-bitcoin-orange hover:text-orange-400 transition-colors text-sm"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      ) : view === 'table' ? (
        <InvoiceTable
          invoices={filteredInvoices}
          onView={setSelectedInvoice}
          onRelease={handleRelease}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((inv, i) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              index={i}
              onView={() => setSelectedInvoice(inv)}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRelease={handleRelease}
      />
    </Section>
  )
}

function InvoiceCard({
  invoice,
  index,
  onView,
  onRelease,
}: {
  invoice: Invoice
  index: number
  onView: () => void
  onRelease: (id: string) => void
}) {
  return (
    <div
      className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden animate-fade-in group cursor-pointer"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onView}
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
          onClick={(e) => {
            e.stopPropagation()
            onRelease(invoice.id)
          }}
          className="btn-success mt-4 w-full text-sm"
        >
          Release Escrow
        </button>
      )}
    </div>
  )
}
