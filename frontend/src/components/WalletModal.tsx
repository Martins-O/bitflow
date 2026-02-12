import { useState } from 'react'
import { wallet, type StarknetWallet } from '@/services/wallet'

interface WalletModalProps {
    isOpen: boolean
    onClose: () => void
    onConnect: (walletId: string) => Promise<void>
}

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const availableWallets = wallet.detectWallets()
    const hasWallets = wallet.hasStarknetWallet()

    const handleConnect = async (walletId: string) => {
        setLoading(true)
        setError(null)
        try {
            await onConnect(walletId)
            onClose()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="glass-card max-w-md w-full mx-4 p-6 animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-100">Connect Wallet</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                {hasWallets ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400 mb-4">
                            Select a Starknet wallet to connect
                        </p>

                        {availableWallets.map((w) => (
                            <WalletOption
                                key={w.id}
                                wallet={w}
                                onClick={() => handleConnect(w.id)}
                                disabled={loading}
                            />
                        ))}

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <NoWalletFound />
                )}
            </div>
        </div>
    )
}

interface WalletOptionProps {
    wallet: StarknetWallet
    onClick: () => void
    disabled: boolean
}

function WalletOption({ wallet, onClick, disabled }: WalletOptionProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center gap-4 p-4 bg-dark-secondary/40 border border-white/5 rounded-xl hover:border-bitcoin-orange/30 hover:bg-dark-secondary/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
            <span className="text-3xl">{wallet.icon}</span>
            <div className="flex-1 text-left">
                <p className="font-semibold text-gray-100 group-hover:text-bitcoin-orange transition-colors">
                    {wallet.name}
                </p>
                <p className="text-xs text-gray-500">Starknet Wallet</p>
            </div>
            <svg className="w-5 h-5 text-gray-500 group-hover:text-bitcoin-orange transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    )
}

function NoWalletFound() {
    return (
        <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-bitcoin-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-100 mb-2">No Starknet Wallet Found</h3>
            <p className="text-sm text-gray-400 mb-6">
                You need a Starknet wallet extension to use BitFlow
            </p>

            <div className="space-y-3">
                <a
                    href="https://www.argent.xyz/argent-x/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-dark-secondary/40 border border-white/5 rounded-lg hover:border-bitcoin-orange/30 transition-all group"
                >
                    <span className="text-2xl">🔷</span>
                    <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-100 group-hover:text-bitcoin-orange transition-colors">
                            Argent X
                        </p>
                        <p className="text-xs text-gray-500">Most popular Starknet wallet</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>

                <a
                    href="https://braavos.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-dark-secondary/40 border border-white/5 rounded-lg hover:border-bitcoin-orange/30 transition-all group"
                >
                    <span className="text-2xl">🦁</span>
                    <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-100 group-hover:text-bitcoin-orange transition-colors">
                            Braavos
                        </p>
                        <p className="text-xs text-gray-500">Advanced Starknet wallet</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>

            <p className="text-xs text-gray-500 mt-4">
                After installing, refresh this page to connect
            </p>
        </div>
    )
}
