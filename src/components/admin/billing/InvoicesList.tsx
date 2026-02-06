'use client';

import { useState, useEffect } from 'react';

interface Invoice {
    id: string;
    number: string;
    customerEmail: string;
    customerName: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
    date: string;
    dueDate?: string;
    description?: string;
}

export function InvoicesList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'PAID' | 'PENDING' | 'FAILED'>('all');

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const fetchInvoices = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = filter !== 'all' ? `?status=${filter}` : '';
            const res = await fetch(`/api/admin/billing/invoices${params}`);
            if (!res.ok) throw new Error('Failed to fetch invoices');

            const data = await res.json();
            setInvoices(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            PAID: 'bg-green-100 text-green-700 border-green-200',
            PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            FAILED: 'bg-red-100 text-red-700 border-red-200',
            REFUNDED: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-3">Loading invoices...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-600">{error}</p>
                <button
                    onClick={fetchInvoices}
                    className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Filter Tabs */}
            <div className="border-b border-gray-200 px-6 py-3">
                <div className="flex gap-2">
                    {(['all', 'PAID', 'PENDING', 'FAILED'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {f === 'all' ? 'All Invoices' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Invoice #</th>
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Customer</th>
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Amount</th>
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left p-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No invoices found
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 font-mono text-sm text-gray-900">{inv.number}</td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-gray-900">{inv.customerName}</div>
                                        <div className="text-xs text-gray-500">{inv.customerEmail}</div>
                                    </td>
                                    <td className="p-4 font-semibold text-gray-900">
                                        ${inv.amount.toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                                inv.status
                                            )}`}
                                        >
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(inv.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {invoices.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}

export default InvoicesList;
