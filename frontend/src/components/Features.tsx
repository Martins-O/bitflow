import { FeatureCard } from './FeatureCard'

export function Features() {
    return (
        <section className="py-16 sm:py-20 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4">
                        Why Choose <span className="text-bitcoin-orange">BitFlow</span>?
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Built on Starknet for security, speed, and trustless transactions
                    </p>
                </div>

                {/* Feature grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        }
                        title="Secure Escrow"
                        description="Funds are held in smart contract escrow until both parties confirm. Built-in protection for buyers and sellers."
                        gradient="from-emerald-500 to-teal-600"
                    />

                    <FeatureCard
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        }
                        title="Lightning Fast"
                        description="Powered by Starknet L2 for instant transactions with minimal fees. No more waiting for confirmations."
                        gradient="from-bitcoin-orange to-orange-600"
                    />

                    <FeatureCard
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        }
                        title="Dispute Resolution"
                        description="Fair arbitration system for handling disputes. Transparent, on-chain resolution process."
                        gradient="from-starknet-purple to-purple-700"
                    />
                </div>
            </div>
        </section>
    )
}
