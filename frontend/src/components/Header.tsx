import { Link, useLocation } from 'react-router-dom'
import { formatAddress } from '@/services/api'

interface Props {
  connected: boolean
  address: string | null
  loading: boolean
  onToggleWallet: () => void
}

const navItems = [
  { to: '/create', label: 'Create' },
  { to: '/pay', label: 'Pay' },
  { to: '/track', label: 'Track' },
  { to: '/dashboard', label: 'Dashboard' },
]

export function Header({ connected, address, loading, onToggleWallet }: Props) {
  const { pathname } = useLocation()

  return (
    <header className="bg-[#0A0D1A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <nav className="flex justify-between items-center py-3">
          <Link
            to="/"
            className="text-2xl font-extrabold bg-gradient-to-r from-bitcoin-orange to-bitcoin-orange-light bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            ⚡ BitFlow
          </Link>

          <div className="flex items-center gap-6">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  pathname === to
                    ? 'text-bitcoin-orange bg-bitcoin-orange/10'
                    : 'text-gray-400 hover:text-bitcoin-orange hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="flex items-center gap-3 px-4 py-2 bg-dark-secondary/80 rounded-xl border border-white/5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-gray-500 animate-pulse'
                }`}
              />
              <span className="text-sm font-mono text-gray-400">
                {connected && address
                  ? formatAddress(address)
                  : 'Not connected'}
              </span>
            </div>

            <button
              onClick={onToggleWallet}
              disabled={loading}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                connected
                  ? 'bg-dark-tertiary text-gray-300 border border-white/10 hover:border-white/20 hover:text-white'
                  : 'bg-orange-gradient text-white shadow-glow-orange hover:shadow-glow-orange-lg hover:-translate-y-0.5'
              } disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading ? 'Connecting...' : connected ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
