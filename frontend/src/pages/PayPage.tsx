import { useOutletContext } from 'react-router-dom'
import { PayInvoiceForm } from '@/components/PayInvoiceForm'
import type { LayoutContext } from '@/types'

export function PayPage() {
  const { connected, notify, setGlobalLoading, refreshDashboard } = useOutletContext<LayoutContext>()

  return (
    <div className="max-w-2xl mx-auto">
      <PayInvoiceForm
        connected={connected}
        onNotify={notify}
        onLoading={setGlobalLoading}
        onPaid={refreshDashboard}
      />
    </div>
  )
}
