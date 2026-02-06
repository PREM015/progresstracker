'use client';

import { useEffect, useState } from 'react';

interface TicketStatsData {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  unassigned: number;
  critical: number;
}

export function TicketStats() {
  const [stats, setStats] = useState<TicketStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/support-tickets', { method: 'HEAD' });
        if (!res.ok) throw new Error('Failed to fetch ticket stats');
        setStats({
          total: Number(res.headers.get('X-Total-Count') || 0),
          open: Number(res.headers.get('X-Open-Count') || 0),
          inProgress: Number(res.headers.get('X-In-Progress-Count') || 0),
          waiting: Number(res.headers.get('X-Waiting-Count') || 0),
          unassigned: Number(res.headers.get('X-Unassigned-Count') || 0),
          critical: Number(res.headers.get('X-Critical-Count') || 0),
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
              <div className="h-6 bg-zinc-800 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-400">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Total</div>
        <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Open</div>
        <div className="text-2xl font-bold text-blue-400">{stats?.open || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">In Progress</div>
        <div className="text-2xl font-bold text-yellow-400">{stats?.inProgress || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Waiting</div>
        <div className="text-2xl font-bold text-purple-400">{stats?.waiting || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Unassigned</div>
        <div className="text-2xl font-bold text-zinc-200">{stats?.unassigned || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Critical</div>
        <div className="text-2xl font-bold text-red-400">{stats?.critical || 0}</div>
      </div>
    </div>
  );
}

export default TicketStats;

