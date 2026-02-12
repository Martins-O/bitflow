import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="text-center py-16 relative overflow-hidden">
      <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white via-bitcoin-orange to-orange-300 bg-clip-text text-transparent">
        Bitcoin Payments on Starknet
      </h2>
      <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
        Secure, fast, and escrow-enabled Bitcoin payments using Starknet smart
        contracts
      </p>
      <div className="flex justify-center gap-4 mb-12">
        <Link
          to="/create"
          className="px-6 py-3 bg-orange-gradient text-white font-bold rounded-xl shadow-glow-orange hover:shadow-glow-orange-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          Get Started
        </Link>
        <Link
          to="/dashboard"
          className="px-6 py-3 border border-white/10 text-gray-300 font-bold rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200"
        >
          View Dashboard
        </Link>
      </div>

      {/* Stats row */}
      <div className="flex justify-center gap-8 sm:gap-16">
        <StatItem label="Total Volume" value="--" unit="BTC" />
        <StatItem label="Active Invoices" value="--" />
        <StatItem label="Transactions" value="--" />
      </div>
    </section>
  )
}

function StatItem({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-bitcoin-orange">
        {value}
        {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  )
}
