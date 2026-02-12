interface Props {
  visible: boolean
}

export function LoadingOverlay({ visible }: Props) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-[#0A0D1A]/90 flex flex-col justify-center items-center z-[9999] backdrop-blur-md">
      <div className="w-16 h-16 border-4 border-dark-tertiary border-t-bitcoin-orange rounded-full animate-spin-slow mb-4" />
      <p className="text-gray-300 text-lg">Processing transaction...</p>
      <p className="text-gray-500 text-sm mt-1">Please wait while we confirm on-chain</p>
    </div>
  )
}
