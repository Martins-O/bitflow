/**
 * In-memory invoice cache with TTL to avoid O(n) chain reads on every request.
 * Invoices are immutable once created (only status changes), so we cache aggressively
 * and invalidate individual entries on write operations.
 */
class InvoiceCache {
  constructor() {
    this.cache = new Map()       // invoiceId → { invoice, cachedAt }
    this.listCache = null        // { invoices, cachedAt }
    this.TTL = 30_000            // 30 seconds for individual invoices
    this.LIST_TTL = 15_000       // 15 seconds for full list
    this.nextIdCache = null      // { nextId, cachedAt }
    this.NEXT_ID_TTL = 10_000   // 10 seconds for next ID
  }

  getInvoice(id) {
    const entry = this.cache.get(String(id))
    if (!entry) return null
    if (Date.now() - entry.cachedAt > this.TTL) {
      this.cache.delete(String(id))
      return null
    }
    return entry.invoice
  }

  setInvoice(id, invoice) {
    this.cache.set(String(id), { invoice, cachedAt: Date.now() })
  }

  invalidateInvoice(id) {
    this.cache.delete(String(id))
    this.listCache = null // also invalidate list since an invoice changed
  }

  getList(filterKey) {
    if (!this.listCache) return null
    if (this.listCache.filterKey !== filterKey) return null
    if (Date.now() - this.listCache.cachedAt > this.LIST_TTL) {
      this.listCache = null
      return null
    }
    return this.listCache.invoices
  }

  setList(filterKey, invoices) {
    this.listCache = { filterKey, invoices, cachedAt: Date.now() }
  }

  getNextId() {
    if (!this.nextIdCache) return null
    if (Date.now() - this.nextIdCache.cachedAt > this.NEXT_ID_TTL) {
      this.nextIdCache = null
      return null
    }
    return this.nextIdCache.nextId
  }

  setNextId(nextId) {
    this.nextIdCache = { nextId, cachedAt: Date.now() }
  }

  invalidateAll() {
    this.cache.clear()
    this.listCache = null
    this.nextIdCache = null
  }
}

module.exports = new InvoiceCache()
