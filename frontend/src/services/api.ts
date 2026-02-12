import axios, { type AxiosInstance } from 'axios'
import type { Invoice, CreateInvoiceData, InvoiceFilter } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message =
          error.response?.data?.message || error.message || 'API request failed'
        throw new Error(message)
      },
    )
  }

  async createInvoice(data: CreateInvoiceData): Promise<{ invoiceId: string }> {
    const response = await this.client.post('/invoices/create', {
      amount: data.amount.toString(),
      description: data.description,
      escrowEnabled: data.escrowEnabled,
      expiryTimestamp: this.calculateExpiryTimestamp(data.expiryHours),
    })
    return response.data
  }

  async payInvoice(
    invoiceId: string,
    useEscrow = false,
  ): Promise<{ transactionHash: string }> {
    const response = await this.client.post('/invoices/pay', {
      invoiceId,
      useEscrow,
    })
    return response.data
  }

  async releaseEscrow(invoiceId: string): Promise<{ transactionHash: string }> {
    const response = await this.client.post('/invoices/release', {
      invoiceId,
    })
    return response.data
  }

  async disputeInvoice(invoiceId: string): Promise<{ transactionHash: string }> {
    const response = await this.client.post('/invoices/dispute', {
      invoiceId,
    })
    return response.data
  }

  async resolveDispute(
    invoiceId: string,
    winner: string,
  ): Promise<{ transactionHash: string }> {
    const response = await this.client.post('/invoices/resolve', {
      invoiceId,
      winner,
    })
    return response.data
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await this.client.get(`/invoices/${invoiceId}`)
    return response.data
  }

  async getInvoices(filter: InvoiceFilter = {}): Promise<Invoice[]> {
    const params = new URLSearchParams()
    if (filter.address) params.append('address', filter.address)
    if (filter.status) params.append('status', filter.status)
    const response = await this.client.get(`/invoices?${params.toString()}`)
    return response.data
  }

  async getBalance(address: string): Promise<{ balance: string }> {
    const response = await this.client.get(`/balance/${address}`)
    return response.data
  }

  private calculateExpiryTimestamp(hours: number): number {
    return Math.floor(Date.now() / 1000) + hours * 3600
  }
}

export const api = new ApiService()

export function formatAmount(amount: string, decimals = 8): string {
  return parseFloat(amount).toFixed(decimals).replace(/\.?0+$/, '')
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
