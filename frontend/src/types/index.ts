export type InvoiceStatus = 'PENDING' | 'PAID' | 'RELEASED' | 'EXPIRED' | 'RESOLVED'

export interface Invoice {
  id: string
  amount: string
  description: string
  status: InvoiceStatus
  escrowEnabled: boolean
  merchantAddress?: string
  payerAddress?: string
  createdAt: number
  expiryTimestamp: number
  transactionHash?: string
  isDisputed?: boolean
}

export interface CreateInvoiceData {
  amount: number
  description: string
  expiryHours: number
  escrowEnabled: boolean
}

export interface InvoiceFilter {
  address?: string
  status?: InvoiceStatus
  type?: string
}

export interface WalletInfo {
  connected: boolean
  address: string
  wallet: string
}

export type NotificationType = 'success' | 'error' | 'info'

export interface Notification {
  id: string
  message: string
  type: NotificationType
}

export interface LayoutContext {
  connected: boolean
  address: string | null
  notify: (msg: string, type: NotificationType) => void
  setGlobalLoading: (v: boolean) => void
  refreshDashboard: () => void
}
