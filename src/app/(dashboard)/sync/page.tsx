"use client";

import { useState, useEffect } from "react";

interface SyncStatus {
  platform: string;
  status: 'syncing' | 'success' | 'error' | 'idle';
  lastSync?: string;
  message?: string;
}

export default function SyncPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/platforms/user')
      .then(r => r.json())
      .then(data => {
        setPlatforms(data.platforms || []);
        const statuses: Record<string, SyncStatus> = {};
        data.platforms?.forEach((p: any) => {
          statuses[p.id] = {
            platform: p.platform.name,
            status: 'idle',
            lastSync: p.lastSyncAt,
          };
        });
        setSyncStatuses(statuses);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    for (const platform of platforms) {
      await handleSyncPlatform(platform.id);
    }
    setSyncing(false);
  };

  const handleSyncPlatform = async (platformId: string) => {
    setSyncStatuses(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], status: 'syncing' }
    }));

    try {
      const response = await fetch(`/api/platforms/${platformId}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        setSyncStatuses(prev => ({
          ...prev,
          [platformId]: { ...prev[platformId], status: 'success', lastSync: new Date().toISOString() }
        }));
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      setSyncStatuses(prev => ({
        ...prev,
        [platformId]: { ...prev[platformId], status: 'error', message: 'Sync failed' }
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Sync Platforms</h1>
            <p className="text-gray-600 mt-2">Manually sync your connected platforms</p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing || platforms.length === 0}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing All...' : 'Sync All'}
          </button>
        </div>

        {platforms.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔗</span>
            <p className="mt-4 text-gray-500">No platforms connected</p>
            <a
              href="/platforms"
              className="mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Connect Platforms
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {platforms.map(platform => {
              const status = syncStatuses[platform.id];
              return (
                <div key={platform.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{platform.platform?.icon || '🌐'}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{platform.platform?.name}</h3>
                        <p className="text-sm text-gray-500">
                          {status?.lastSync
                            ? `Last synced: ${new Date(status.lastSync).toLocaleString()}`
                            : 'Never synced'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {status?.status === 'syncing' && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className="text-sm">Syncing...</span>
                        </div>
                      )}
                      {status?.status === 'success' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="text-xl">✓</span>
                          <span className="text-sm">Synced</span>
                        </div>
                      )}
                      {status?.status === 'error' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <span className="text-xl">✗</span>
                          <span className="text-sm">{status.message}</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleSyncPlatform(platform.id)}
                        disabled={status?.status === 'syncing'}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        Sync Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
