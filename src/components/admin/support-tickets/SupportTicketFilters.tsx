'use client';

import { useState, useEffect } from 'react';

export function SupportTicketFilters({ filters, onChange }: { filters: any; onChange: (f: any) => void }) {
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        // Fetch available categories
        fetch('/api/admin/support-tickets/categories')
            .then(res => res.json())
            .then(data => setCategories(data || []));
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
                value={filters.status || ''}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
            </select>

            <select
                value={filters.priority || ''}
                onChange={(e) => onChange({ ...filters, priority: e.target.value })}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
                <option value="">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
            </select>

            <select
                value={filters.category || ''}
                onChange={(e) => onChange({ ...filters, category: e.target.value })}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
                <option value="">All Categories</option>
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>

            <input
                type="text"
                placeholder="Search tickets..."
                value={filters.search || ''}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
        </div>
    );
}

export default SupportTicketFilters;
