"use client";

import { useState, useEffect } from "react";

export default function SyncHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sync/history')
      .then(r => r.json())
      .then(data => setHistory(data.history || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-4xl font-bold mb-8">Sync History</h1>

        {history.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔄</span>
            <p className="mt-4 text-gray-500">No sync history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-3 h-3 rounded-full ${entry.status === 'SUCCESS' ? 'bg-green-500' :
                          entry.status === 'FAILED' ? 'bg-red-500' :
                            'bg-yellow-500'
                        }`} />
                      <span className="font-bold text-gray-900">{entry.platform?.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${entry.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                          entry.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Started: {new Date(entry.startedAt).toLocaleString()}</div>
                      {entry.completedAt && (
                        <div>Completed: {new Date(entry.completedAt).toLocaleString()}</div>
                      )}
                      {entry.itemsSynced !== undefined && (
                        <div>Items Synced: {entry.itemsSynced}</div>
                      )}
                      {entry.error && (
                        <div className="text-red-600">Error: {entry.error}</div>
                      )}
                    </div>
                  </div>
                  {entry.duration && (
                    <div className="text-sm text-gray-500">{entry.duration}s</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
