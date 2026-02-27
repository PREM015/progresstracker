"use client";

import { useState, useEffect } from "react";

export default function SyncConflictsPage() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sync/conflicts')
      .then(r => r.json())
      .then(data => setConflicts(data.conflicts || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const resolveConflict = async (conflictId: string, resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE') => {
    await fetch(`/api/sync/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    setConflicts(conflicts.filter(c => c.id !== conflictId));
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
        <h1 className="text-4xl font-bold mb-8">Sync Conflicts</h1>

        {conflicts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">✓</span>
            <p className="mt-4 text-gray-500">No sync conflicts</p>
          </div>
        ) : (
          <div className="space-y-6">
            {conflicts.map(conflict => (
              <div key={conflict.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{conflict.platform?.name} - {conflict.type}</h3>
                  <p className="text-sm text-gray-600">{conflict.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-bold text-blue-900 mb-2">Local Version</h4>
                    <pre className="text-sm text-blue-800 whitespace-pre-wrap">{JSON.stringify(conflict.localData, null, 2)}</pre>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-bold text-green-900 mb-2">Remote Version</h4>
                    <pre className="text-sm text-green-800 whitespace-pre-wrap">{JSON.stringify(conflict.remoteData, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => resolveConflict(conflict.id, 'KEEP_LOCAL')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, 'KEEP_REMOTE')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Keep Remote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
