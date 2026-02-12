import type { Invoice } from '@/types'

interface DisputeActionsProps {
    invoice: Invoice
    onRaiseDispute: () => void
    onResolveDispute: (winner: 'creator' | 'payer') => void
    isOwner?: boolean
    loading?: boolean
}

export function DisputeActions({
    invoice,
    onRaiseDispute,
    onResolveDispute,
    isOwner = false,
    loading = false,
}: DisputeActionsProps) {
    const canRaiseDispute = invoice.status === 'PAID' && invoice.escrowEnabled && !invoice.isDisputed
    const canResolve = invoice.isDisputed && isOwner

    if (!canRaiseDispute && !canResolve) return null

    return (
        <div className="mt-4 space-y-3">
            {canRaiseDispute && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm text-gray-300 mb-2">
                                Issue with this payment? You can raise a dispute to lock the funds until resolution.
                            </p>
                            <button
                                onClick={onRaiseDispute}
                                className="px-4 py-2 bg-danger-gradient text-white text-sm font-semibold rounded-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                                disabled={loading}
                            >
                                Raise Dispute
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {canResolve && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-starknet-purple flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-200 mb-1">Resolve Dispute (Owner Only)</p>
                            <p className="text-xs text-gray-400 mb-3">
                                As the contract owner, you can resolve this dispute by choosing the winner.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onResolveDispute('creator')}
                                    className="flex-1 px-3 py-2 bg-success-gradient text-white text-sm font-semibold rounded-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                                    disabled={loading}
                                >
                                    Award Creator
                                </button>
                                <button
                                    onClick={() => onResolveDispute('payer')}
                                    className="flex-1 px-3 py-2 bg-orange-gradient text-white text-sm font-semibold rounded-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                                    disabled={loading}
                                >
                                    Refund Payer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
