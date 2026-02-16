import { useState, type FormEvent } from 'react'
import { api, formatAmount, formatTimestamp, formatAddress, invalidateInvoiceCache } from '@/services/api'
import { wallet } from '@/services/wallet'
import { ResultMessage } from './ResultMessage'
import { StatusBadge } from './StatusBadge'
import { DisputeBadge } from './DisputeBadge'
import { DisputeModal } from './DisputeModal'
import { DisputeActions } from './DisputeActions'
import type { Invoice } from '@/types'

export function TrackInvoiceForm() {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)

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

  async function handleAction(action: 'release' | 'dispute' | 'resolve', winner?: string) {
    if (!invoice) return

    // Open modal for dispute instead of direct action
    if (action === 'dispute') {
      setDisputeModalOpen(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let result
      if (action === 'release') {
        result = await wallet.releaseEscrow(invoice.id)
        alert(`Funds Released! Tx: ${result.transactionHash}`)
      } else if (action === 'resolve' && winner) {
        result = await wallet.resolveDispute(invoice.id, winner)
        alert(`Dispute Resolved! Tx: ${result.transactionHash}`)
      }

      invalidateInvoiceCache(invoice.id)
      // Refresh invoice
      const updated = await api.getInvoice(invoice.id)
      setInvoice(updated)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisputeSubmit(reason: string) {
    if (!invoice) return
    setLoading(true)
    setError(null)

    try {
      const result = await wallet.disputeInvoice(invoice.id)
      alert(`Dispute Raised! Tx: ${result.transactionHash}\nReason: ${reason}`)

      invalidateInvoiceCache(invoice.id)
      // Refresh invoice
      const updated = await api.getInvoice(invoice.id)
      setInvoice(updated)
      setDisputeModalOpen(false)
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
            {invoice.isDisputed && (
              <div className="col-span-full">
                <DisputeBadge isDisputed={true} className="w-full justify-center py-2" />
              </div>
            )}
          </div>

          <DisputeActions
            invoice={invoice}
            onRaiseDispute={() => setDisputeModalOpen(true)}
            onResolveDispute={(winner) => {
              const winnerAddress = winner === 'creator' ? invoice.merchantAddress : invoice.payerAddress
              if (winnerAddress) handleAction('resolve', winnerAddress)
            }}
            isOwner={false} // TODO: Check if current user is contract owner
            loading={loading}
          />
        </div>
      )}

      <DisputeModal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        onSubmit={handleDisputeSubmit}
        loading={loading}
      />
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
