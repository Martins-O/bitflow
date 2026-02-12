import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-bitcoin-orange/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-starknet-purple/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative max-w-4xl mx-auto text-center px-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-bitcoin-orange/10 border border-bitcoin-orange/20 rounded-full mb-6 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bitcoin-orange opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-bitcoin-orange"></span>
          </span>
          <span className="text-sm font-semibold text-bitcoin-orange">Powered by Starknet L2</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-white via-bitcoin-orange to-orange-300 bg-clip-text text-transparent animate-fade-in">
            Bitcoin Payments
          </span>
          <br />
          <span className="bg-gradient-to-r from-orange-300 via-starknet-purple to-purple-400 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Made Simple
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Secure, fast, and <span className="text-bitcoin-orange font-semibold">escrow-enabled</span> Bitcoin payments using Starknet smart contracts.
          <span className="block mt-2 text-gray-500">Trustless transactions with built-in dispute resolution.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Link
            to="/create"
            className="group px-8 py-4 bg-orange-gradient text-white font-bold rounded-xl shadow-glow-orange hover:shadow-glow-orange-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>Create Invoice</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-4 border-2 border-white/10 text-gray-300 font-bold rounded-xl hover:bg-white/5 hover:border-bitcoin-orange/30 hover:-translate-y-1 transition-all duration-200 backdrop-blur-sm"
          >
            View Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 sm:gap-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <StatItem label="Total Volume" value="--" unit="BTC" />
          <StatItem label="Active Invoices" value="--" />
          <StatItem label="Transactions" value="--" />
        </div>
      </div>
    </section>
  )
}

function StatItem({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="text-center group">
      <div className="mb-2 p-4 rounded-xl bg-dark-secondary/40 border border-white/5 group-hover:border-bitcoin-orange/20 transition-all duration-300">
        <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-bitcoin-orange to-orange-300 bg-clip-text text-transparent">
          {value}
          {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>
      <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
    </div>
  )
}
