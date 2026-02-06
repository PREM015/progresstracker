'use client';

import { useEffect, useState } from 'react';

interface SyncData {
  status: string;
  stats: {
    idle: number;
    pending: number;
    inProgress: number;
    success: number;
    partial: number;
    failed: number;
    cancelled: number;
    rateLimited: number;
  };
  avgDurationMs?: number;
  recentFailures?: number;
}

export function SyncStats() {
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/sync');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch sync stats');
        setData(json?.data || json);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
              <div className="h-6 bg-zinc-800 rounded w-2/3" />
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Status</div>
        <div className="text-2xl font-bold text-white">{data?.status || 'idle'}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">In Progress</div>
        <div className="text-2xl font-bold text-blue-400">{data?.stats?.inProgress || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Failed (24h)</div>
        <div className="text-2xl font-bold text-red-400">{data?.recentFailures || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Avg Duration</div>
        <div className="text-2xl font-bold text-white">
          {data?.avgDurationMs ? `${Math.round(data.avgDurationMs / 1000)}s` : '—'}
        </div>
      </div>
    </div>
  );
}

export default SyncStats;

