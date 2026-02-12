import { useEffect, useState } from 'react'

const typeStyles = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-bitcoin-orange/10 text-bitcoin-orange border-bitcoin-orange/20',
} as const

interface Props {
  message: string | null
  type: 'success' | 'error' | 'info'
  autoHideMs?: number
}

export function ResultMessage({ message, type, autoHideMs = 8000 }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), autoHideMs)
      return () => clearTimeout(timer)
    }
    setVisible(false)
  }, [message, autoHideMs])

  if (!visible || !message) return null

  return (
    <div
      className={`mt-4 p-4 rounded-xl font-medium border animate-fade-in text-sm ${typeStyles[type]}`}
      role="status"
    >
      {message}
    </div>
  )
}
