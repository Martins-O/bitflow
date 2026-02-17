import { useState, useEffect } from 'react'
import type { Payment, PaymentFilter } from '@/types/payment'
import { formatAmount, formatTimestamp, formatAddress } from '@/services/api'

interface Props {
    connected: boolean
    address: string | null
}

// Mock data for demonstration - will be replaced with API calls
const mockPayments: Payment[] = []

export function PaymentHistory({ connected, address }: Props) {
    const [payments, setPayments] = useState<Payment[]>([])
    const [filter, setFilter] = useState<PaymentFilter>({
        type: 'all',
        status: 'all',
        search: '',
    })

    useEffect(() => {
        if (!connected || !address) {
            setPayments([])
            return
        }

        // TODO: Replace with actual API call
        setPayments(mockPayments)
    }, [connected, address])

    const filteredPayments = payments.filter((payment) => {
        if (filter.type !== 'all' && payment.type !== filter.type) return false
        if (filter.status !== 'all' && payment.status !== filter.status) return false
        if (filter.search) {
            const searchLower = filter.search.toLowerCase()
            const matchesId = payment.invoiceId.toLowerCase().includes(searchLower)
            const matchesTx = payment.txHash.toLowerCase().includes(searchLower)
            if (!matchesId && !matchesTx) return false
        }
        return true
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white">Payment History</h2>
            </div>

            {/* Filters */}
            <div className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Search</label>
                        <input
                            type="text"
                            placeholder="Invoice ID or TX hash..."
                            value={filter.search || ''}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            className="input-field w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Type</label>
                        <select
                            value={filter.type || 'all'}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value as PaymentFilter['type'] })}
                            className="input-field w-full"
                        >
                            <option value="all">All Types</option>
                            <option value="direct">Direct</option>
                            <option value="escrow">Escrow</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Status</label>
                        <select
                            value={filter.status || 'all'}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value as PaymentFilter['status'] })}
                            className="input-field w-full"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {!connected ? (
                <div className="text-center py-12 space-y-3">
                    <div className="text-6xl">🔌</div>
                    <p className="text-gray-400 text-lg">Connect your wallet to view payment history</p>
                </div>
            ) : filteredPayments.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                    <div className="text-6xl">💸</div>
                    <p className="text-gray-400 text-lg">No payments found</p>
                    <p className="text-gray-500 text-sm">Your payment transactions will appear here</p>
                </div>
            ) : (
                <div className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-dark-tertiary/60 border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Invoice ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        TX Hash
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredPayments.map((payment, index) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-white/5 transition-colors animate-fade-in"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className="text-xs text-gray-400 font-mono">
                                                {formatTimestamp(payment.timestamp)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-gray-300">#{payment.invoiceId}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className="font-bold text-bitcoin-orange">
                                                {formatAmount(payment.amount)}
                                            </span>
                                            <span className="text-xs text-gray-500 ml-1">BTC</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-block px-2 py-1 text-xs rounded-full ${payment.type === 'escrow'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    }`}
                                            >
                                                {payment.type === 'escrow' ? 'Escrow' : 'Direct'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-block px-2 py-1 text-xs rounded-full ${payment.status === 'confirmed'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : payment.status === 'pending'
                                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}
                                            >
                                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <a
                                                href={`https://sepolia.starkscan.co/tx/${payment.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-bitcoin-orange hover:text-orange-400 transition-colors font-mono"
                                            >
                                                {formatAddress(payment.txHash)} ↗
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
