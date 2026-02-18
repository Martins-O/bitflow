import type { Invoice } from '@/types'
import { formatAmount, formatTimestamp, formatAddress } from '@/services/api'
import { StatusBadge } from '../StatusBadge'
import { DisputeBadge } from '../DisputeBadge'

interface Props {
    invoice: Invoice | null
    onClose: () => void
    onRelease?: (invoiceId: string) => void
}

export function InvoiceDetailModal({ invoice, onClose, onRelease }: Props) {
    if (!invoice) return null

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-dark-secondary rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="sticky top-0 bg-dark-secondary border-b border-white/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white">Invoice #{invoice.id}</h2>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={invoice.status} />
                            {invoice.isDisputed && <DisputeBadge isDisputed={true} />}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Amount */}
                    <div className="bg-gradient-to-br from-bitcoin-orange/20 to-orange-600/20 rounded-xl p-6 border border-bitcoin-orange/30">
                        <div className="text-sm text-gray-400 mb-2">Amount</div>
                        <div className="text-4xl font-bold text-bitcoin-orange">
                            {formatAmount(invoice.amount)} <span className="text-xl text-gray-500">BTC</span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailCard label="Description" value={invoice.description} />
                        <DetailCard
                            label="Escrow"
                            value={invoice.escrowEnabled ? 'Enabled ✅' : 'Disabled'}
                            valueClass={invoice.escrowEnabled ? 'text-emerald-400' : 'text-gray-400'}
                        />
                        <DetailCard label="Created At" value={formatTimestamp(invoice.createdAt)} />
                        <DetailCard label="Expires At" value={formatTimestamp(invoice.expiryTimestamp)} />
                        {invoice.merchantAddress && (
                            <DetailCard
                                label="Merchant Address"
                                value={formatAddress(invoice.merchantAddress)}
                                mono
                            />
                        )}
                        {invoice.payerAddress && (
                            <DetailCard
                                label="Payer Address"
                                value={formatAddress(invoice.payerAddress)}
                                mono
                            />
                        )}
                        {invoice.transactionHash && (
                            <DetailCard
                                label="Transaction Hash"
                                value={formatAddress(invoice.transactionHash)}
                                mono
                                link={`https://sepolia.starkscan.co/tx/${invoice.transactionHash}`}
                            />
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="bg-dark-tertiary/60 rounded-xl p-6 border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                        <div className="space-y-3">
                            <TimelineEvent
                                icon="📝"
                                label="Invoice Created"
                                timestamp={invoice.createdAt}
                                color="blue"
                            />
                            {invoice.status !== 'PENDING' && (
                                <TimelineEvent
                                    icon="💰"
                                    label="Payment Received"
                                    timestamp={invoice.createdAt}
                                    color="emerald"
                                />
                            )}
                            {invoice.status === 'RELEASED' && (
                                <TimelineEvent
                                    icon="🔓"
                                    label="Escrow Released"
                                    timestamp={invoice.createdAt}
                                    color="teal"
                                />
                            )}
                            {invoice.isDisputed && (
                                <TimelineEvent
                                    icon="⚠️"
                                    label="Dispute Raised"
                                    timestamp={invoice.createdAt}
                                    color="red"
                                />
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {invoice.status === 'PAID' && invoice.escrowEnabled && onRelease && (
                        <button
                            onClick={() => {
                                onRelease(invoice.id)
                                onClose()
                            }}
                            className="btn-success w-full"
                        >
                            Release Escrow Funds
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function DetailCard({
    label,
    value,
    valueClass = 'text-gray-300',
    mono = false,
    link,
}: {
    label: string
    value: string
    valueClass?: string
    mono?: boolean
    link?: string
}) {
    return (
        <div className="bg-dark-tertiary/60 rounded-lg p-4 border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
            {link ? (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm ${valueClass} ${mono ? 'font-mono' : ''} hover:text-bitcoin-orange transition-colors underline`}
                >
                    {value} ↗
                </a>
            ) : (
                <div className={`text-sm ${valueClass} ${mono ? 'font-mono' : ''}`}>{value}</div>
            )}
        </div>
    )
}

function TimelineEvent({
    icon,
    label,
    timestamp,
    color,
}: {
    icon: string
    label: string
    timestamp: number
    color: string
}) {
    const colorClasses = {
        blue: 'bg-blue-500/20 border-blue-500/30',
        emerald: 'bg-emerald-500/20 border-emerald-500/30',
        teal: 'bg-teal-500/20 border-teal-500/30',
        red: 'bg-red-500/20 border-red-500/30',
    }

    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center text-sm`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="text-sm text-gray-300 font-medium">{label}</div>
                <div className="text-xs text-gray-500 font-mono">{formatTimestamp(timestamp)}</div>
            </div>
        </div>
    )
}
