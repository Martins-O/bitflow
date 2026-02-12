import type { Notification as NotificationType } from '@/types'

const borderColor = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-bitcoin-orange',
} as const

const icons = {
  success: '\u2713',
  error: '\u2717',
  info: '\u2139',
} as const

interface Props {
  notification: NotificationType | null
  onClose: () => void
}

export function Notification({ notification, onClose }: Props) {
  if (!notification) return null

  return (
    <div
      className={`fixed top-6 right-6 z-50 max-w-sm px-5 py-4 rounded-xl text-gray-100 shadow-glass-lg animate-slide-in bg-dark-secondary/90 backdrop-blur-xl border border-white/5 border-l-4 ${borderColor[notification.type]}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{icons[notification.type]}</span>
        <span className="text-sm">{notification.message}</span>
      </div>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 opacity-80 hover:opacity-100 hover:bg-white/10 transition"
        aria-label="Close notification"
      >
        &times;
      </button>
    </div>
  )
}
