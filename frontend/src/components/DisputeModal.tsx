import { useState } from 'react'

interface DisputeModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (reason: string) => void
    loading?: boolean
}

export function DisputeModal({ isOpen, onClose, onSubmit, loading = false }: DisputeModalProps) {
    const [reason, setReason] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (reason.trim()) {
            onSubmit(reason)
            setReason('')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-card p-6 w-full max-w-md animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <svg className="w-6 h-6 text-dispute-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        Raise Dispute
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="dispute-reason" className="block text-sm font-medium text-gray-400 mb-2">
                            Reason for Dispute
                        </label>
                        <textarea
                            id="dispute-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input-field min-h-[120px] resize-none"
                            placeholder="Describe the issue with this invoice..."
                            required
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                            This will lock the escrow funds until the dispute is resolved by the contract owner.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-dark-tertiary text-gray-300 border border-white/10 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all duration-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-danger-gradient text-white font-semibold rounded-xl shadow-glow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={loading || !reason.trim()}
                        >
                            {loading ? 'Submitting...' : 'Raise Dispute'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
