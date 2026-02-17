export interface Payment {
    id: string
    invoiceId: string
    amount: string
    from: string
    to: string
    type: 'direct' | 'escrow'
    status: 'pending' | 'confirmed' | 'failed'
    timestamp: number
    txHash: string
    blockNumber?: number
    gasFee?: string
}

export interface PaymentStats {
    totalPaid: string
    totalReceived: string
    avgTransaction: string
    directCount: number
    escrowCount: number
    monthlyVolume: { month: string; volume: number }[]
}

export interface TimelineEvent {
    type: 'created' | 'paid' | 'deposited' | 'released' | 'disputed' | 'resolved'
    timestamp: number
    description: string
    txHash?: string
    actor?: string
}

export interface PaymentFilter {
    startDate?: Date | null
    endDate?: Date | null
    type?: 'direct' | 'escrow' | 'all'
    status?: 'pending' | 'confirmed' | 'failed' | 'all'
    search?: string
}
