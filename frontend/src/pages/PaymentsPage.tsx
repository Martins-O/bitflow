import { useOutletContext } from 'react-router-dom'
import { Section } from '@/components/Section'
import { PaymentHistory } from '@/components/payments/PaymentHistory'
import type { LayoutContext } from '@/types'

export function PaymentsPage() {
    const { connected, address } = useOutletContext<LayoutContext>()

    return (
        <Section id="payments" title="">
            <PaymentHistory connected={connected} address={address} />
        </Section>
    )
}
