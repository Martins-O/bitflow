export function HowItWorks() {
    return (
        <section className="py-16 sm:py-20 px-4 bg-dark-secondary/30">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-4">
                        How It Works
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Simple, secure payments in four easy steps
                    </p>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <Step
                        number="1"
                        title="Create Invoice"
                        description="Set amount, description, and expiry. Enable escrow for buyer protection."
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        }
                    />

                    <Step
                        number="2"
                        title="Receive Payment"
                        description="Share invoice ID with buyer. They pay with Bitcoin via Starknet."
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />

                    <Step
                        number="3"
                        title="Confirm Delivery"
                        description="Buyer confirms goods/services received. Escrow funds are ready for release."
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        }
                    />

                    <Step
                        number="4"
                        title="Release Funds"
                        description="Funds automatically released to seller. Secure, trustless, complete."
                        icon={
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        }
                    />
                </div>
            </div>
        </section>
    )
}

interface StepProps {
    number: string
    title: string
    description: string
    icon: React.ReactNode
}

function Step({ number, title, description, icon }: StepProps) {
    return (
        <div className="relative group">
            {/* Connector line (hidden on last item) */}
            <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-bitcoin-orange/50 to-transparent group-last:hidden" />

            <div className="relative text-center">
                {/* Number badge */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-bitcoin-orange to-orange-600 text-white mb-4 shadow-glow-orange group-hover:scale-110 transition-transform duration-300">
                    {icon}
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-bitcoin-orange text-sm font-bold flex items-center justify-center border-2 border-dark-primary">
                        {number}
                    </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
