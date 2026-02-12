interface Tab {
  id: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'create', label: 'Create', icon: '＋' },
  { id: 'pay', label: 'Pay', icon: '⚡' },
  { id: 'track', label: 'Track', icon: '🔍' },
]

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex bg-dark-secondary/80 rounded-2xl p-1.5 border border-white/5 backdrop-blur-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-orange-gradient text-white shadow-glow-orange'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
