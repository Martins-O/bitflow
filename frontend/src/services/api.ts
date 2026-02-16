import axios, { type AxiosInstance } from 'axios'
import type { Invoice } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const CACHE_PREFIX = 'bitflow_'
const INVOICE_TTL = 30_000
const LIST_TTL = 15_000

function getCached<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number }
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // localStorage full or unavailable
  }
}

export function invalidateInvoiceCache(invoiceId?: string): void {
  try {
    if (invoiceId) {
      localStorage.removeItem(CACHE_PREFIX + `invoice_${invoiceId}`)
    }
    // Always invalidate list cache on any write
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX + 'invoices_'))
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

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

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const cached = getCached<Invoice>(`invoice_${invoiceId}`, INVOICE_TTL)
    if (cached) return cached

    const response = await this.client.get(`/invoices/${invoiceId}`)
    const invoice = response.data.invoice
    setCache(`invoice_${invoiceId}`, invoice)
    return invoice
  }

  async getInvoices(filter: Record<string, string> = {}): Promise<Invoice[]> {
    const filterKey = `invoices_${JSON.stringify(filter)}`
    const cached = getCached<Invoice[]>(filterKey, LIST_TTL)
    if (cached) return cached

    const params = new URLSearchParams(filter)
    const response = await this.client.get(`/invoices?${params.toString()}`)
    const invoices = response.data.invoices
    setCache(filterKey, invoices)
    return invoices
  }

  async getBalance(address: string): Promise<{ balance: string; balanceInBTC: string }> {
    const response = await this.client.get(`/invoices/balance/${address}`)
    return response.data
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
