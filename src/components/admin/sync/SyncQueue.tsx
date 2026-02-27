'use client';

import { useEffect, useState } from 'react';

export function SyncQueue() {
  const [running, setRunning] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/sync');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch sync queue');
        const data = json?.data || json;
        setRunning(data?.running || []);
      } catch (err) {
        console.error(err);
        setRunning([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Running Syncs</h3>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : running.length === 0 ? (
        <div className="text-zinc-500">No running syncs</div>
      ) : (
        <div className="space-y-3">
          {running.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3"
            >
              <div>
                <div className="text-white text-sm">{item.platform || 'Unknown platform'}</div>
                <div className="text-xs text-zinc-500">{item.user || 'Unknown user'}</div>
              </div>
              <div className="text-xs text-blue-400">
                Started {item.startedAt ? new Date(item.startedAt).toLocaleTimeString() : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SyncQueue;
