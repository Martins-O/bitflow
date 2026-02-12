import { useState, type FormEvent } from 'react'
import { api } from '@/services/api'
import { ResultMessage } from './ResultMessage'
import type { NotificationType } from '@/types'

interface Props {
  connected: boolean
  onNotify: (msg: string, type: NotificationType) => void
  onLoading: (v: boolean) => void
  onInvoiceCreated: () => void
}

export function CreateInvoiceForm({
  connected,
  onNotify,
  onLoading,
  onInvoiceCreated,
}: Props) {
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
      const res = await api.createInvoice({
        amount: parseFloat(form.get('amount') as string),
        description: form.get('description') as string,
        expiryHours: parseInt(form.get('expiry') as string, 10),
        escrowEnabled: form.get('escrowEnabled') === 'on',
      })
      setResult({ message: `Invoice created! ID: ${res.invoiceId}`, type: 'success' })
      e.currentTarget.reset()
      onInvoiceCreated()
    } catch (err) {
      setResult({ message: (err as Error).message, type: 'error' })
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-100 mb-6">Create Invoice</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-sm font-medium text-gray-400">
            Amount (BTC)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.00000001"
            min="0.00000001"
            required
            className="input-field"
            placeholder="0.001"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-gray-400">
            Description
          </label>
          <input
            type="text"
            id="description"
            name="description"
            required
            className="input-field"
            placeholder="Payment for..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiry" className="text-sm font-medium text-gray-400">
            Expiry Time
          </label>
          <select id="expiry" name="expiry" className="input-field" defaultValue="24">
            <option value="1">1 Hour</option>
            <option value="6">6 Hours</option>
            <option value="12">12 Hours</option>
            <option value="24">24 Hours</option>
            <option value="48">48 Hours</option>
            <option value="168">1 Week</option>
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            name="escrowEnabled"
            className="w-5 h-5 rounded bg-dark-secondary border-white/10 text-bitcoin-orange focus:ring-bitcoin-orange/30 accent-bitcoin-orange"
          />
          <span className="font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
            Enable Escrow Protection
          </span>
        </label>

        <button type="submit" className="btn-primary mt-2">
          Create Invoice
        </button>
      </form>

      {result && (
        <ResultMessage message={result.message} type={result.type} />
      )}
    </div>
  )
}
