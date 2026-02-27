'use client';

import React, { useState, useEffect } from 'react';

interface SyncHistory {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'partial';
  itemsSynced: number;
  duration: number;
  errorMessage?: string;
}

interface SyncHistoryListProps {
  platformId: string;
  className?: string;
}

export const SyncHistoryList: React.FC<SyncHistoryListProps> = ({
  platformId,
  className = '',
}) => {
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/platforms/${platformId}/sync-history`)
      .then(r => r.json())
      .then(data => setHistory(data))
      .finally(() => setLoading(false));
  }, [platformId]);

  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
    </div>;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Sync History</h3>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No sync history yet</div>
        ) : (
          history.map((sync) => (
            <div
              key={sync.id}
              className={`p-4 border-2 rounded-lg ${sync.status === 'success' ? 'border-green-200 bg-green-50' :
                  sync.status === 'error' ? 'border-red-200 bg-red-50' :
                    'border-yellow-200 bg-yellow-50'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {sync.status === 'success' ? '✅' : sync.status === 'error' ? '❌' : '⚠️'}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {sync.status === 'success' ? 'Sync Successful' :
                        sync.status === 'error' ? 'Sync Failed' :
                          'Partial Sync'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(sync.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-gray-900">{sync.itemsSynced} items</div>
                  <div className="text-gray-500">{sync.duration}s</div>
                </div>
              </div>

              {sync.errorMessage && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                  {sync.errorMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SyncHistoryList;
