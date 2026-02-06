'use client';

import { useEffect, useState } from 'react';

export interface WaitlistFilterValues {
  status: string;
  search: string;
}

export function WaitlistFilters({ onChange }: { onChange?: (filters: WaitlistFilterValues) => void }) {
  const [filters, setFilters] = useState<WaitlistFilterValues>({ status: '', search: '' });

  useEffect(() => {
    onChange?.(filters);
  }, [filters, onChange]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search email or name"
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
        >
          <option value="">All Statuses</option>
          <option value="waiting">Waiting</option>
          <option value="invited">Invited</option>
          <option value="joined">Joined</option>
        </select>
      </div>
    </div>
  );
}

export default WaitlistFilters;
