'use client';

import { useEffect, useState } from 'react';

interface ReportStatsData {
  total: number;
  sent: number;
  failed: number;
}

export function ReportStats() {
  const [stats, setStats] = useState<ReportStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/reports', { method: 'HEAD' });
        if (!res.ok) throw new Error('Failed to fetch report stats');

        const total = Number(res.headers.get('X-Total-Count') || 0);
        const sent = Number(res.headers.get('X-Sent-Count') || 0);
        const failed = Number(res.headers.get('X-Failed-Count') || 0);
        setStats({ total, sent, failed });
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-zinc-800 rounded w-1/3" />
              <div className="h-7 bg-zinc-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400">
        {error}
      </div>
    );
  }

  const successRate =
    stats && stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="text-sm text-zinc-500 mb-2">Total Reports</div>
        <div className="text-3xl font-bold text-white">
          {stats?.total.toLocaleString() || 0}
        </div>
        <div className="text-xs text-zinc-600 mt-2">All time</div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="text-sm text-zinc-500 mb-2">Sent Reports</div>
        <div className="text-3xl font-bold text-green-400">
          {stats?.sent.toLocaleString() || 0}
        </div>
        <div className="text-xs text-zinc-600 mt-2">Delivered to users</div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="text-sm text-zinc-500 mb-2">Success Rate</div>
        <div className="text-3xl font-bold text-blue-400">{successRate}%</div>
        <div className="text-xs text-zinc-600 mt-2">
          Failed: {stats?.failed.toLocaleString() || 0}
        </div>
      </div>
    </div>
  );
}

export default ReportStats;

