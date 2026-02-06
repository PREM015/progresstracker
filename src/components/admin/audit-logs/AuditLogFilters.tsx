'use client';

export function AuditLogFilters({ filters, onChange }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Action..." value={filters.action} onChange={e => onChange({ ...filters, action: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
            <select value={filters.category} onChange={e => onChange({ ...filters, category: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none">
                <option value="">All Categories</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="SYSTEM">System</option>
                <option value="SECURITY">Security</option>
            </select>
            <input type="date" value={filters.startDate} onChange={e => onChange({ ...filters, startDate: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none" />
            <input type="date" value={filters.endDate} onChange={e => onChange({ ...filters, endDate: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none" />
        </div>
    );
}

export default AuditLogFilters;
