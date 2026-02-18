interface Props {
    view: 'cards' | 'table'
    onViewChange: (view: 'cards' | 'table') => void
}

export function ViewToggle({ view, onViewChange }: Props) {
    return (
        <div className="inline-flex bg-dark-tertiary/60 rounded-xl p-1 border border-white/10">
            <button
                onClick={() => onViewChange('cards')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${view === 'cards'
                        ? 'bg-bitcoin-orange text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
            >
                <span className="flex items-center gap-2">
                    <span>🎴</span>
                    Cards
                </span>
            </button>
            <button
                onClick={() => onViewChange('table')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${view === 'table'
                        ? 'bg-bitcoin-orange text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
            >
                <span className="flex items-center gap-2">
                    <span>📊</span>
                    Table
                </span>
            </button>
        </div>
    )
}
