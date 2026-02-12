import { useOutletContext } from 'react-router-dom'
import { CreateInvoiceForm } from '@/components/CreateInvoiceForm'
import type { LayoutContext } from '@/types'

export function CreatePage() {
  const { connected, notify, setGlobalLoading, refreshDashboard } = useOutletContext<LayoutContext>()

  return (
    <div className="max-w-2xl mx-auto">
      <CreateInvoiceForm
        connected={connected}
        onNotify={notify}
        onLoading={setGlobalLoading}
        onInvoiceCreated={refreshDashboard}
      />
    </div>
  )
}
