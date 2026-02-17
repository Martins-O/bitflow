import { useState } from 'react'
import type { Invoice } from '@/types'
import { formatAmount, formatTimestamp } from '@/services/api'
import { StatusBadge } from '../StatusBadge'
import { DisputeBadge } from '../DisputeBadge'

interface Props {
    invoices: Invoice[]
    onView: (invoice: Invoice) => void
    onRelease: (invoiceId: string) => void
}

type SortColumn = 'id' | 'amount' | 'status' | 'createdAt' | 'expiryTimestamp'
type SortDirection = 'asc' | 'desc'

export function InvoiceTable({ invoices, onView, onRelease }: Props) {
    const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const sortedInvoices = [...invoices].sort((a, b) => {
        let aValue: string | number
        let bValue: string | number

        switch (sortColumn) {
            case 'id':
                aValue = parseInt(a.id)
                bValue = parseInt(b.id)
                break
            case 'amount':
                aValue = parseFloat(a.amount)
                bValue = parseFloat(b.amount)
                break
            case 'status':
                aValue = a.status
                bValue = b.status
                break
            case 'createdAt':
                aValue = a.createdAt
                bValue = b.createdAt
                break
            case 'expiryTimestamp':
                aValue = a.expiryTimestamp
                bValue = b.expiryTimestamp
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    // Pagination
    const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage)

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return <span className="text-gray-600">⇅</span>
        return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>
    }

    return (
        <div className="bg-dark-secondary/60 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-dark-tertiary/60 border-b border-white/5">
                        <tr>
                            <th
                                onClick={() => handleSort('id')}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    ID <SortIcon column="id" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('amount')}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    Amount <SortIcon column="amount" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Description
                            </th>
                            <th
                                onClick={() => handleSort('status')}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    Status <SortIcon column="status" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('createdAt')}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    Created <SortIcon column="createdAt" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('expiryTimestamp')}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    Expires <SortIcon column="expiryTimestamp" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedInvoices.map((invoice, index) => (
                            <tr
                                key={invoice.id}
                                className="hover:bg-white/5 transition-colors animate-fade-in"
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="font-mono text-sm text-gray-300">#{invoice.id}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="font-bold text-bitcoin-orange">
                                        {formatAmount(invoice.amount)}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-1">BTC</span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="max-w-xs">
                                        <p className="text-sm text-gray-300 truncate">{invoice.description}</p>
                                        {invoice.escrowEnabled && (
                                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                                                Escrow
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={invoice.status} />
                                        {invoice.isDisputed && <DisputeBadge isDisputed={true} />}
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="text-xs text-gray-400 font-mono">
                                        {formatTimestamp(invoice.createdAt)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="text-xs text-gray-400 font-mono">
                                        {formatTimestamp(invoice.expiryTimestamp)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onView(invoice)}
                                            className="px-3 py-1.5 text-xs bg-dark-tertiary text-gray-300 border border-white/10 rounded-lg font-semibold hover:border-white/20 hover:text-white transition-all duration-200"
                                        >
                                            View
                                        </button>
                                        {invoice.status === 'PAID' && invoice.escrowEnabled && (
                                            <button
                                                onClick={() => onRelease(invoice.id)}
                                                className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 transition-all duration-200"
                                            >
                                                Release
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-dark-tertiary/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedInvoices.length)} of{' '}
                        {sortedInvoices.length} invoices
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value))
                            setCurrentPage(1)
                        }}
                        className="input-field text-sm py-1"
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm bg-dark-tertiary text-gray-300 border border-white/10 rounded-lg font-semibold hover:border-white/20 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-400">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm bg-dark-tertiary text-gray-300 border border-white/10 rounded-lg font-semibold hover:border-white/20 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
