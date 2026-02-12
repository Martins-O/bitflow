interface DisputeBadgeProps {
    isDisputed: boolean
    className?: string
}

export function DisputeBadge({ isDisputed, className = '' }: DisputeBadgeProps) {
    if (!isDisputed) return null

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-dispute-red/10 text-dispute-red border border-dispute-red/20 ${className}`}
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
            </svg>
            Disputed
        </span>
    )
}
