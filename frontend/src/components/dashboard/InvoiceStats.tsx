import { useEffect, useState } from 'react'
import type { Invoice } from '@/types'

interface InvoiceStats {
    total: number
    pending: number
    paid: number
    released: number
    expired: number
    totalVolume: string
    escrowBalance: string
}

interface Props {
    invoices: Invoice[]
}

export function InvoiceStats({ invoices }: Props) {
    const [stats, setStats] = useState<InvoiceStats>({
        total: 0,
        pending: 0,
        paid: 0,
        released: 0,
        expired: 0,
        totalVolume: '0',
        escrowBalance: '0',
    })

    useEffect(() => {
        const newStats: InvoiceStats = {
            total: invoices.length,
            pending: 0,
            paid: 0,
            released: 0,
            expired: 0,
            totalVolume: '0',
            escrowBalance: '0',
        }

        let totalVolume = 0
        let escrowBalance = 0

        invoices.forEach((invoice) => {
            const amount = parseFloat(invoice.amount)
            totalVolume += amount

            switch (invoice.status) {
                case 'PENDING':
                    newStats.pending++
                    break
                case 'PAID':
                    newStats.paid++
                    if (invoice.escrowEnabled) {
                        escrowBalance += amount
                    }
                    break
                case 'RELEASED':
                    newStats.released++
                    break
                case 'EXPIRED':
                    newStats.expired++
                    break
            }
        })

        newStats.totalVolume = totalVolume.toFixed(8)
        newStats.escrowBalance = escrowBalance.toFixed(8)

        setStats(newStats)
    }, [invoices])

    const statCards = [
        {
            label: 'Total Invoices',
            value: stats.total,
            icon: '📋',
            color: 'from-blue-500/20 to-blue-600/20',
            border: 'border-blue-500/30',
        },
        {
            label: 'Pending',
            value: stats.pending,
            icon: '⏳',
            color: 'from-amber-500/20 to-amber-600/20',
            border: 'border-amber-500/30',
        },
        {
            label: 'Paid',
            value: stats.paid,
            icon: '✅',
            color: 'from-emerald-500/20 to-emerald-600/20',
            border: 'border-emerald-500/30',
        },
        {
            label: 'Released',
            value: stats.released,
            icon: '🔓',
            color: 'from-teal-500/20 to-teal-600/20',
            border: 'border-teal-500/30',
        },
        {
            label: 'Total Volume',
            value: `${stats.totalVolume} BTC`,
            icon: '💰',
            color: 'from-bitcoin-orange/20 to-orange-600/20',
            border: 'border-bitcoin-orange/30',
        },
        {
            label: 'Escrow Balance',
            value: `${stats.escrowBalance} BTC`,
            icon: '🔒',
            color: 'from-purple-500/20 to-purple-600/20',
            border: 'border-purple-500/30',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {statCards.map((card, index) => (
                <div
                    key={card.label}
                    className={`bg-gradient-to-br ${card.color} backdrop-blur-sm rounded-xl p-4 border ${card.border} hover:scale-105 transition-all duration-300 animate-fade-in`}
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">
                            {card.label}
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                    </div>
                </div>
            ))}
        </div>
    )
}
