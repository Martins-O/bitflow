import { useEffect, useState } from 'react'
import type { Payment } from '@/types/payment'

interface Stats {
    totalPaid: string
    totalReceived: string
    avgTransaction: string
    directCount: number
    escrowCount: number
}

interface Props {
    payments: Payment[]
    userAddress: string | null
}

export function PaymentStats({ payments, userAddress }: Props) {
    const [stats, setStats] = useState<Stats>({
        totalPaid: '0',
        totalReceived: '0',
        avgTransaction: '0',
        directCount: 0,
        escrowCount: 0,
    })

    useEffect(() => {
        if (!userAddress || payments.length === 0) {
            setStats({
                totalPaid: '0',
                totalReceived: '0',
                avgTransaction: '0',
                directCount: 0,
                escrowCount: 0,
            })
            return
        }

        let totalPaid = 0
        let totalReceived = 0
        let directCount = 0
        let escrowCount = 0

        payments.forEach((payment) => {
            const amount = parseFloat(payment.amount)

            if (payment.from.toLowerCase() === userAddress.toLowerCase()) {
                totalPaid += amount
            }
            if (payment.to.toLowerCase() === userAddress.toLowerCase()) {
                totalReceived += amount
            }

            if (payment.type === 'direct') {
                directCount++
            } else {
                escrowCount++
            }
        })

        const avgTransaction = payments.length > 0 ? (totalPaid + totalReceived) / payments.length : 0

        setStats({
            totalPaid: totalPaid.toFixed(8),
            totalReceived: totalReceived.toFixed(8),
            avgTransaction: avgTransaction.toFixed(8),
            directCount,
            escrowCount,
        })
    }, [payments, userAddress])

    const statCards = [
        {
            label: 'Total Paid',
            value: `${stats.totalPaid} BTC`,
            icon: '💸',
            color: 'from-red-500/20 to-red-600/20',
            border: 'border-red-500/30',
        },
        {
            label: 'Total Received',
            value: `${stats.totalReceived} BTC`,
            icon: '💰',
            color: 'from-emerald-500/20 to-emerald-600/20',
            border: 'border-emerald-500/30',
        },
        {
            label: 'Avg Transaction',
            value: `${stats.avgTransaction} BTC`,
            icon: '📊',
            color: 'from-blue-500/20 to-blue-600/20',
            border: 'border-blue-500/30',
        },
        {
            label: 'Direct Payments',
            value: stats.directCount,
            icon: '⚡',
            color: 'from-purple-500/20 to-purple-600/20',
            border: 'border-purple-500/30',
        },
        {
            label: 'Escrow Payments',
            value: stats.escrowCount,
            icon: '🔒',
            color: 'from-teal-500/20 to-teal-600/20',
            border: 'border-teal-500/30',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
