'use client';

import { useState } from 'react';
import { useAdminAuditLogs } from '@/hooks/useAdminLogs';

export function AuditLogsList() {
    const [filters, setFilters] = useState({
        action: '',
        category: '',
        userId: '',
    });
    const [page, setPage] = useState(1);

    const { logs, pagination, isLoading: loading, error } = useAdminAuditLogs({
        ...filters,
        page,
        limit: 50
    });

    const total = pagination?.total || 0;

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'text-green-400';
        if (action.includes('UPDATE')) return 'text-blue-400';
        if (action.includes('DELETE')) return 'text-red-400';
        if (action.includes('LOGIN')) return 'text-purple-400';
        return 'text-zinc-400';
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            USER: 'bg-blue-500/20 text-blue-400',
            ADMIN: 'bg-red-500/20 text-red-400',
            SYSTEM: 'bg-purple-500/20 text-purple-400',
            SECURITY: 'bg-yellow-500/20 text-yellow-400',
        };
        return colors[category] || 'bg-zinc-700 text-zinc-300';
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Filter by action..."
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />

                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Categories</option>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SYSTEM">System</option>
                        <option value="SECURITY">Security</option>
                    </select>

                    <input
                        type="text"
                        placeholder="User ID..."
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                        onClick={() => setFilters({ action: '', category: '', userId: '' })}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Timestamp</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">User</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Action</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Category</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Description</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-red-400">
                                        {(error as any)?.message || 'Error loading logs'}
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4 text-sm text-zinc-400">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            {log.user ? (
                                                <div>
                                                    <div className="text-white text-sm">{log.user.name || 'No name'}</div>
                                                    <div className="text-zinc-500 text-xs">{log.user.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500 text-sm">System</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(log.category)}`}>
                                                {log.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-300 max-w-md truncate">
                                            {log.description || '-'}
                                        </td>
                                        <td className="p-4 text-sm text-zinc-500 font-mono">
                                            {log.ipAddress || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                    <div className="text-sm text-zinc-500">
                        Showing {logs.length} of {total} logs
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-zinc-400">Page {page}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={logs.length < 50}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuditLogsList;
