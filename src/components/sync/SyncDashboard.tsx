'use client';

import React, { useEffect, useState } from 'react';

interface SyncDashboardProps {
  className?: string;
}

export const SyncDashboard: React.FC<SyncDashboardProps> = ({
  className = '',
}) => {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/platforms/summary');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch platforms');
        setPlatforms(json?.data?.platforms || []);
      } catch (err) {
        console.error(err);
        setPlatforms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const triggerSyncAll = async () => {
    setSyncingAll(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync/trigger-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || 'Failed to trigger sync');
      setMessage(json?.data?.message || json?.message || 'Sync queued');
    } catch (err: any) {
      setMessage(err.message || 'Failed to trigger sync');
    } finally {
      setSyncingAll(false);
    }
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '—';
    const ts = new Date(dateStr).getTime();
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Sync Dashboard</h3>

      <div className="space-y-3">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading platforms...</div>
        ) : platforms.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No platforms connected</div>
        ) : (
          platforms.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-semibold text-gray-900">{platform.name}</div>
                <div className="text-sm text-gray-600">
                  Last sync: {timeAgo(platform.lastSync)} - {platform.itemsCount ?? 0} items
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(platform.connected)}`}>
                {platform.connected ? 'connected' : 'not connected'}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={triggerSyncAll}
        disabled={syncingAll || platforms.length === 0}
        className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {syncingAll ? 'Syncing...' : 'Sync All Platforms'}
      </button>
      {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
    </div>
  );
};

export default SyncDashboard;
