import { useState, type FormEvent } from 'react'
import { api } from '@/services/api'
import { ResultMessage } from './ResultMessage'
import type { NotificationType } from '@/types'

interface Props {
  connected: boolean
  onNotify: (msg: string, type: NotificationType) => void
  onLoading: (v: boolean) => void
  onPaid: () => void
}

export function PayInvoiceForm({ connected, onNotify, onLoading, onPaid }: Props) {
  const [result, setResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!connected) {
      onNotify('Please connect your wallet first', 'error')
      return
    }

    onLoading(true)
    setResult(null)

    try {
      const form = new FormData(e.currentTarget)
      const invoiceId = form.get('invoiceId') as string
      const useEscrow = form.get('useEscrow') === 'on'

      const res = await api.payInvoice(invoiceId, useEscrow)
      const msg = useEscrow
        ? `Paid with escrow! Tx: ${res.transactionHash}`
        : `Paid successfully! Tx: ${res.transactionHash}`

      setResult({ message: msg, type: 'success' })
      e.currentTarget.reset()
      onPaid()
    } catch (err) {
      setResult({ message: (err as Error).message, type: 'error' })
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-100 mb-6">Pay Invoice</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invoiceId" className="text-sm font-medium text-gray-400">
            Invoice ID
          </label>
          <input
            type="text"
            id="invoiceId"
            name="invoiceId"
            required
            className="input-field"
            placeholder="Enter invoice ID"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            name="useEscrow"
            className="w-5 h-5 rounded bg-dark-secondary border-white/10 text-bitcoin-orange focus:ring-bitcoin-orange/30 accent-bitcoin-orange"
          />
          <span className="font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
            Use Escrow Payment
          </span>
        </label>

        <button type="submit" className="btn-success mt-2">
          Pay Invoice
        </button>
      </form>

      {result && (
        <ResultMessage message={result.message} type={result.type} />
      )}
    </div>
  )
}
