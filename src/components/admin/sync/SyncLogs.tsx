'use client';

import { useEffect, useState } from 'react';

export function SyncLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/sync');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch logs');
        const data = json?.data || json;
        setLogs(data?.recentSyncs || []);
      } catch (err) {
        console.error(err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Syncs</h3>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-zinc-500">No sync logs yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Platform</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">User</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Duration</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Items</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="p-3 text-white">{log.platform || '—'}</td>
                  <td className="p-3 text-zinc-400">{log.user || '—'}</td>
                  <td className="p-3 text-zinc-400">{log.status}</td>
                  <td className="p-3 text-zinc-400">
                    {log.duration ? `${Math.round(log.duration / 1000)}s` : '—'}
                  </td>
                  <td className="p-3 text-zinc-400">{log.itemsCreated ?? '—'}</td>
                  <td className="p-3 text-zinc-400">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SyncLogs;
