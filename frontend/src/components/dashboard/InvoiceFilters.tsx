import { useState } from 'react'
import type { InvoiceStatus } from '@/types'

export interface InvoiceFilterOptions {
    status: InvoiceStatus | 'all'
    type: 'all' | 'created' | 'paid' | 'disputed'
    search: string
    escrowOnly: boolean
    dateRange: {
        start: string
        end: string
    }
    amountRange: {
        min: string
        max: string
    }
}

interface Props {
    filters: InvoiceFilterOptions
    onFilterChange: (filters: InvoiceFilterOptions) => void
    onReset: () => void
}

export function InvoiceFilters({ filters, onFilterChange, onReset }: Props) {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleChange = (key: keyof InvoiceFilterOptions, value: unknown) => {
        onFilterChange({ ...filters, [key]: value })
    }

    const handleRangeChange = (
        rangeKey: 'dateRange' | 'amountRange',
        key: 'start' | 'end' | 'min' | 'max',
        value: string
    ) => {
        onFilterChange({
            ...filters,
            [rangeKey]: { ...filters[rangeKey], [key]: value },
        })
    }

    const hasActiveFilters =
        filters.status !== 'all' ||
        filters.type !== 'all' ||
        filters.search !== '' ||
        filters.escrowOnly ||
        filters.dateRange.start !== '' ||
        filters.dateRange.end !== '' ||
        filters.amountRange.min !== '' ||
        filters.amountRange.max !== ''

    return (
        <div className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/5 mb-6">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">Search</label>
                    <input
                        type="text"
                        placeholder="Invoice ID or description..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        className="input-field w-full"
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="input-field w-full"
                    >
                        <option value="all">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="RELEASED">Released</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="RESOLVED">Resolved</option>
                    </select>
                </div>

                {/* Type Filter */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Type</label>
                    <select
                        value={filters.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="input-field w-full"
                    >
                        <option value="all">All Invoices</option>
                        <option value="created">My Created</option>
                        <option value="paid">My Paid</option>
                        <option value="disputed">Disputed</option>
                    </select>
                </div>
            </div>

            {/* Advanced Filters Toggle */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-bitcoin-orange hover:text-orange-400 transition-colors mb-4 flex items-center gap-2"
            >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                Advanced Filters
            </button>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 animate-fade-in">
                    {/* Date Range */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) => handleRangeChange('dateRange', 'start', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Start"
                            />
                            <input
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) => handleRangeChange('dateRange', 'end', e.target.value)}
                                className="input-field text-sm"
                                placeholder="End"
                            />
                        </div>
                    </div>

                    {/* Amount Range */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Amount Range (BTC)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                step="0.00000001"
                                value={filters.amountRange.min}
                                onChange={(e) => handleRangeChange('amountRange', 'min', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Min"
                            />
                            <input
                                type="number"
                                step="0.00000001"
                                value={filters.amountRange.max}
                                onChange={(e) => handleRangeChange('amountRange', 'max', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Max"
                            />
                        </div>
                    </div>

                    {/* Escrow Only */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="escrowOnly"
                            checked={filters.escrowOnly}
                            onChange={(e) => handleChange('escrowOnly', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-dark-tertiary text-bitcoin-orange focus:ring-bitcoin-orange focus:ring-offset-dark-primary"
                        />
                        <label htmlFor="escrowOnly" className="text-sm text-gray-300 cursor-pointer">
                            Escrow Enabled Only
                        </label>
                    </div>
                </div>
            )}

            {/* Actions */}
            {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <button
                        onClick={onReset}
                        className="px-4 py-2 text-sm bg-dark-tertiary text-gray-300 border border-white/10 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all duration-200"
                    >
                        Reset Filters
                    </button>
                </div>
            )}
        </div>
    )
}
