import { useState, type FormEvent } from 'react'
import { api, formatAmount, formatTimestamp, formatAddress } from '@/services/api'
import { ResultMessage } from './ResultMessage'
import { StatusBadge } from './StatusBadge'
import type { Invoice } from '@/types'

export function TrackInvoiceForm() {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInvoice(null)
    setError(null)
    setLoading(true)

    try {
      const form = new FormData(e.currentTarget)
      const id = form.get('trackInvoiceId') as string
      const result = await api.getInvoice(id)
      setInvoice(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-100 mb-6">Track Invoice</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trackInvoiceId" className="text-sm font-medium text-gray-400">
            Invoice ID
          </label>
          <input
            type="text"
            id="trackInvoiceId"
            name="trackInvoiceId"
            required
            className="input-field"
            placeholder="Enter invoice ID to track"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Tracking...' : 'Track Invoice'}
        </button>
      </form>

      {error && <ResultMessage message={error} type="error" />}

      {invoice && (
        <div className="mt-6 bg-dark-secondary/60 rounded-xl p-5 border border-white/5 animate-fade-in">
          <h4 className="font-bold text-gray-100 mb-4">Invoice Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Detail label="ID" value={invoice.id} />
            <Detail label="Amount" value={`${formatAmount(invoice.amount)} BTC`} highlight />
            <div className="text-sm p-3 bg-dark-tertiary/60 rounded-lg border border-white/5">
              <span className="text-gray-500">Status:</span>{' '}
              <StatusBadge status={invoice.status} />
            </div>
            <Detail label="Description" value={invoice.description} />
            <Detail label="Created" value={formatTimestamp(invoice.createdAt)} />
            <Detail label="Expires" value={formatTimestamp(invoice.expiryTimestamp)} />
            <Detail label="Escrow" value={invoice.escrowEnabled ? 'Yes' : 'No'} />
            {invoice.merchantAddress && (
              <Detail label="Merchant" value={formatAddress(invoice.merchantAddress)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-sm p-3 bg-dark-tertiary/60 rounded-lg border border-white/5">
      <span className="text-gray-500">{label}:</span>{' '}
      <span className={highlight ? 'text-bitcoin-orange font-semibold' : 'text-gray-300'}>{value}</span>
    </div>
  )
}
