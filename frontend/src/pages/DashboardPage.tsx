import { useOutletContext } from 'react-router-dom'
import { Dashboard } from '@/components/Dashboard'
import type { LayoutContext } from '@/types'

export function DashboardPage() {
  const { connected, address, notify, setGlobalLoading } = useOutletContext<LayoutContext & { refreshKey: number }>()
  const { refreshKey } = useOutletContext<{ refreshKey: number }>()

  return (
    <Dashboard
      connected={connected}
      address={address}
      refreshKey={refreshKey}
      onNotify={notify}
      onLoading={setGlobalLoading}
    />
  )
}
