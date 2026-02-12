import { useState, type FormEvent } from 'react'
import { api, formatAmount, formatTimestamp } from '@/services/api'
import { FormField } from './FormField'
import type { Invoice, NotificationType } from '@/types'

interface Props {
  connected: boolean
  onNotify: (msg: string, type: NotificationType) => void
  onLoading: (v: boolean) => void
  onPaid: () => void
}

export function PayInvoiceForm({ connected, onNotify, onLoading, onPaid }: Props) {
  const [invoiceId, setInvoiceId] = useState('')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<{ message: string; type: 'success' | 'error' | 'pending' } | null>(null)

  async function handleLookup() {
    if (!invoiceId.trim()) return

    setLookupLoading(true)
    setTxStatus(null)
    setInvoice(null)

    try {
      const data = await api.getInvoice(invoiceId)
      setInvoice(data)
      if (data.status === 'PAID' || data.status === 'RELEASED') {
        onNotify('This invoice is already paid', 'info')
      } else if (data.status === 'EXPIRED') {
        onNotify('This invoice has expired', 'error')
      }
    } catch (err) {
      onNotify((err as Error).message, 'error')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handlePayment(e: FormEvent) {
    e.preventDefault()
    if (!connected || !invoice) return

    onLoading(true)
    setTxStatus({ message: 'Initializing payment...', type: 'pending' })

    try {
      // Use the flag if specified in the invoice or assume escrow if enabled
      const res = await api.payInvoice(invoice.id, invoice.escrowEnabled)

      setTxStatus({
        message: `Payment successful! Tx Hash: ${res.transactionHash.slice(0, 10)}...`,
        type: 'success'
      })
      onNotify('Payment successful', 'success')
      onPaid()

      // Refresh local state
      setInvoice(prev => prev ? { ...prev, status: 'PAID' } : null)
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Lookup Card */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-gradient flex items-center justify-center shadow-glow-orange">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-100">Pay Invoice</h3>
            <p className="text-sm text-gray-400">Enter an ID to view and pay an invoice</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <FormField
              label="Invoice ID"
              id="invoiceId"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              }
            >
              <input
                type="text"
                id="invoiceId"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="input-field pl-12 w-full"
                placeholder="Enter unique invoice ID"
              />
            </FormField>
          </div>
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !invoiceId.trim()}
            className="md:mt-7 btn-primary h-[46px] px-8 flex items-center justify-center gap-2 group transition-all duration-300 disabled:opacity-40"
          >
            {lookupLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span>Look up</span>
          </button>
        </div>
      </div>

      {/* Invoice Details Display */}
      {invoice && (
        <div className="glass-card overflow-hidden animate-slide-up border-orange-500/10">
          <div className="bg-orange-gradient h-1.5" />
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left Column: Details */}
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bitcoin-orange/10 border border-bitcoin-orange/20 text-bitcoin-orange text-xs font-bold uppercase tracking-wider mb-4">
                    Invoice Details
                  </div>
                  <h4 className="text-3xl font-black text-white flex items-baseline gap-2 mb-2">
                    {formatAmount(invoice.amount)}
                    <span className="text-lg font-bold text-bitcoin-orange">BTC</span>
                  </h4>
                  <p className="text-gray-400 leading-relaxed italic">
                    "{invoice.description}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${invoice.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' :
                        invoice.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                          invoice.status === 'RELEASED' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                      }`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Escrow</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${invoice.escrowEnabled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-500'}`} />
                      <span className="text-xs text-white font-medium">{invoice.escrowEnabled ? 'Protected' : 'Standard'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Expires</p>
                    <p className="text-xs text-white font-medium">{formatTimestamp(invoice.expiryTimestamp)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Merchant</p>
                    <p className="text-xs text-white font-mono">{invoice.merchantAddress?.slice(0, 6)}...{invoice.merchantAddress?.slice(-4)}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Action */}
              <div className="bg-dark-secondary/20 rounded-2xl p-6 border border-white/5 flex flex-col justify-center items-center text-center">
                {invoice.status === 'PENDING' ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-bitcoin-orange" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.791 15.319c0 2.574-2.074 3.125-4.526 3.434v2.502H8.332v-2.433c-.496.012-1.002.012-1.503.012h-1.42v-2.227h.81c.71 0 .972-.257.972-.942V7.472c0-.65-.21-.92-.973-.92h-.81V4.321h3.047v2.296h1.564c1.94 0 3.736.31 3.736 2.507 0 1.95-1.579 2.227-2.618 2.378 1.488.163 3.255.62 3.255 3.817zm-4.526-6.494h-1.933v2.872h1.933c.895 0 1.636-.205 1.636-1.428 0-1.18-.741-1.444-1.636-1.444zm.292 6.551c.883 0 1.687-.272 1.687-1.583 0-1.282-.804-1.549-1.687-1.549h-2.212v3.132h2.212z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Pay</h3>
                    <p className="text-sm text-gray-400 mb-8 max-w-[240px]">
                      Secure your payment now. Funds will be held in the {invoice.escrowEnabled ? 'escrow contract' : 'registry'} until completion.
                    </p>
                    <button
                      onClick={handlePayment}
                      disabled={!connected}
                      className={`w-full btn-primary py-4 rounded-xl shadow-glow-orange flex items-center justify-center gap-2 group transition-all duration-300 ${!connected ? 'opacity-50' : 'hover:-translate-y-1'}`}
                    >
                      <span>Pay with Starknet</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                    {!connected && (
                      <p className="text-xs text-orange-400 mt-4 animate-pulse">
                        Connect wallet to authorize payment
                      </p>
                    )}
                  </>
                ) : (
                  <div className="py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {invoice.status === 'PAID' || invoice.status === 'RELEASED' ? 'Already Paid' : 'Invoice Expired'}
                    </h3>
                    <p className="text-sm text-gray-400 max-w-[200px] mx-auto">
                      This invoice is no longer active and cannot be paid.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {txStatus && (
              <div className={`mt-8 p-4 rounded-xl border animate-slide-up ${txStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
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
      )}
    </div>
  )
}

