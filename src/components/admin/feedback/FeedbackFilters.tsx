'use client';
export function FeedbackFilters({ filters, onChange }: any) {
    return <div className="grid grid-cols-3 gap-4"><select value={filters.type} onChange={e => onChange({ ...filters, type: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="">All Types</option><option value="BUG">Bug</option><option value="FEATURE">Feature Request</option><option value="OTHER">Other</option></select><select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="">All Status</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select><input type="date" value={filters.date} onChange={e => onChange({ ...filters, date: e.target.value })} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></div>;
}
export default FeedbackFilters;
