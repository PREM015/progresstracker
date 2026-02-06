'use client';

import { useState } from 'react';

type SyncType = 'all' | 'platform' | 'user' | 'failed';

export function SyncControl() {
  const [type, setType] = useState<SyncType>('all');
  const [platformId, setPlatformId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerSync = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const body: any = { type };
      if (type === 'platform') body.platformId = platformId.trim();
      if (type === 'user') body.userId = userId.trim();

      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to trigger sync');
      setMessage(json?.message || 'Sync queued');
    } catch (err: any) {
      setError(err.message || 'Failed to trigger sync');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Trigger Sync</h3>

      <select
        value={type}
        onChange={(e) => setType(e.target.value as SyncType)}
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
      >
        <option value="all">All Active Platforms</option>
        <option value="platform">Specific Platform</option>
        <option value="user">Specific User</option>
        <option value="failed">Retry Failed (24h)</option>
      </select>

      {type === 'platform' && (
        <input
          value={platformId}
          onChange={(e) => setPlatformId(e.target.value)}
          placeholder="Platform ID"
          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
      )}

      {type === 'user' && (
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User ID"
          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
      )}

      <button
        onClick={triggerSync}
        disabled={loading || (type === 'platform' && !platformId.trim()) || (type === 'user' && !userId.trim())}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Queueing...' : 'Queue Sync'}
      </button>

      {message && <div className="text-sm text-green-400">{message}</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}

export default SyncControl;
