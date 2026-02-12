import { useState, useMemo, type FormEvent } from 'react'
import { api } from '@/services/api'
import { FormField } from './FormField'
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
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expiry, setExpiry] = useState('24')
  const [escrowEnabled, setEscrowEnabled] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [txStatus, setTxStatus] = useState<{ message: string; type: 'success' | 'error' | 'pending' } | null>(null)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required'
    } else if (description.length < 3) {
      newErrors.description = 'Description is too short'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!connected) {
      onNotify('Please connect your wallet first', 'error')
      return
    }

    if (!validate()) return

    onLoading(true)
    setTxStatus({ message: 'Initializing transaction...', type: 'pending' })

    try {
      const res = await api.createInvoice({
        amount: parseFloat(amount),
        description,
        expiryHours: parseInt(expiry, 10),
        escrowEnabled,
      })

      setTxStatus({ message: `Invoice created successfully! ID: ${res.invoiceId}`, type: 'success' })
      setAmount('')
      setDescription('')
      setExpiry('24')
      setEscrowEnabled(false)
      onInvoiceCreated()
      onNotify('Invoice created successfully', 'success')
    } catch (err) {
      const errMsg = (err as Error).message
      let friendlyMsg = errMsg
      if (errMsg.includes('User abort') || errMsg.includes('rejected')) {
        friendlyMsg = 'Transaction was rejected in wallet'
      }
      setTxStatus({ message: friendlyMsg, type: 'error' })
      onNotify(friendlyMsg, 'error')
    } finally {
      onLoading(false)
    }
  }

  const expiryLabel = useMemo(() => {
    const map: Record<string, string> = {
      '1': '1 Hour',
      '6': '6 Hours',
      '12': '12 Hours',
      '24': '24 Hours',
      '48': '2 Days',
      '168': '1 Week'
    }
    return map[expiry] || `${expiry} Hours`
  }, [expiry])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
      {/* Form Section */}
      <div className="lg:col-span-3">
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center shadow-glow-orange">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100">Create New Invoice</h3>
              <p className="text-sm text-gray-400">Set up a payment request on Starknet</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Amount (BTC)"
              id="amount"
              error={errors.amount}
              icon={
                <svg className="w-5 h-5 text-bitcoin-orange" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.791 15.319c0 2.574-2.074 3.125-4.526 3.434v2.502H8.332v-2.433c-.496.012-1.002.012-1.503.012h-1.42v-2.227h.81c.71 0 .972-.257.972-.942V7.472c0-.65-.21-.92-.973-.92h-.81V4.321h3.047v2.296h1.564c1.94 0 3.736.31 3.736 2.507 0 1.95-1.579 2.227-2.618 2.378 1.488.163 3.255.62 3.255 3.817zm-4.526-6.494h-1.933v2.872h1.933c.895 0 1.636-.205 1.636-1.428 0-1.18-.741-1.444-1.636-1.444zm.292 6.551c.883 0 1.687-.272 1.687-1.583 0-1.282-.804-1.549-1.687-1.549h-2.212v3.132h2.212z" />
                </svg>
              }
            >
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }))
                }}
                step="0.00000001"
                min="0.00000001"
                required
                className={`input-field pl-12 w-full ${errors.amount ? 'border-red-500/50' : ''}`}
                placeholder="0.00000000"
              />
            </FormField>

            <FormField
              label="Description"
              id="description"
              error={errors.description}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }))
                }}
                required
                className={`input-field pl-12 w-full ${errors.description ? 'border-red-500/50' : ''}`}
                placeholder="What is this payment for?"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Expiry Time"
                id="expiry"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="input-field pl-12 w-full appearance-none bg-dark-secondary"
                >
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="48">2 Days</option>
                  <option value="168">1 Week</option>
                </select>
              </FormField>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-gray-400">Escrow Protection</span>
                <label className="flex items-center gap-3 cursor-pointer select-none group h-[46px]">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={escrowEnabled}
                      onChange={(e) => setEscrowEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${escrowEnabled ? 'bg-bitcoin-orange' : 'bg-white/10'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${escrowEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <span className={`text-sm font-medium transition-colors ${escrowEnabled ? 'text-gray-100' : 'text-gray-500'}`}>
                    {escrowEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className={`btn-primary w-full py-4 text-lg shadow-glow-orange mt-4 flex items-center justify-center gap-2 group transition-all duration-300 ${!connected ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}`}
              disabled={!connected}
            >
              <span>Create Invoice</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>

          {txStatus && (
            <div className={`mt-6 p-4 rounded-xl border animate-slide-up ${txStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                txStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
              <div className="flex items-center gap-3">
                {txStatus.type === 'pending' && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                <p className="text-sm font-medium">{txStatus.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div className="lg:col-span-2">
        <div className="sticky top-24">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Preview</h4>
          <div className="glass-card overflow-hidden border-orange-500/20">
            <div className="bg-orange-gradient h-2 shadow-glow-orange" />
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-2 font-bold text-lg text-white">
                  <span>⚡</span>
                  <span>BitFlow</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400">UNPAID</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Amount</div>
                  <div className="text-3xl font-black text-white flex items-baseline gap-1">
                    {amount || '0.00000000'}
                    <span className="text-sm font-bold text-bitcoin-orange">BTC</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Description</div>
                  <p className="text-sm text-gray-300 line-clamp-2 italic leading-relaxed">
                    {description || 'Your service description will appear here...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Valid for</div>
                    <div className="text-xs text-white font-semibold">{expiryLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Escrow</div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${escrowEnabled ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                      <div className="text-xs text-white font-semibold">{escrowEnabled ? 'Active' : 'Not used'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-white/10">
                <div className="w-full h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs text-gray-500 font-mono">
                  [ Generated Invoice ID ]
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-bitcoin-orange font-bold mr-1">Note:</span>
              Invoices are immutable once created. BTC amount is pegged to the Starknet contract execution.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

