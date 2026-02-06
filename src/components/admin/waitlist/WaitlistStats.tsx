'use client';

import { useEffect, useState } from 'react';

interface Stats {
  total: number;
  waiting: number;
  invited: number;
  joined: number;
}

export function WaitlistStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/waitlist');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch waitlist');
        setStats(json?.data?.stats || null);
      } catch (err) {
        console.error(err);
        setStats(null);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Total</div>
        <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Waiting</div>
        <div className="text-2xl font-bold text-yellow-400">{stats?.waiting || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Invited</div>
        <div className="text-2xl font-bold text-blue-400">{stats?.invited || 0}</div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500">Joined</div>
        <div className="text-2xl font-bold text-green-400">{stats?.joined || 0}</div>
      </div>
    </div>
  );
}

export default WaitlistStats;
