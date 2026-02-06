'use client';

import { useEffect, useState } from 'react';

export interface TicketFilterValues {
  search: string;
  status: string;
  priority: string;
  category: string;
  unassigned: boolean;
}

export function TicketFilters({ onChange }: { onChange?: (filters: TicketFilterValues) => void }) {
  const [filters, setFilters] = useState<TicketFilterValues>({
    search: '',
    status: '',
    priority: '',
    category: '',
    unassigned: false,
  });

  useEffect(() => {
    onChange?.(filters);
  }, [filters, onChange]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search tickets..."
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING">Waiting</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <input
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          placeholder="Category"
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={filters.unassigned}
            onChange={(e) => setFilters({ ...filters, unassigned: e.target.checked })}
            className="h-4 w-4"
          />
          Unassigned only
        </label>
      </div>
    </div>
  );
}

export default TicketFilters;

