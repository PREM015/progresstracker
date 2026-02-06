'use client';

import React from 'react';

interface SyncConflict {
  id: string;
  platform: string;
  local: any;
  remote: any;
  type: string;
}

interface SyncConflictsProps {
  conflicts: SyncConflict[];
  onResolve: (id: string, choice: 'local' | 'remote') => void;
  className?: string;
}

export const SyncConflicts: React.FC<SyncConflictsProps> = ({
  conflicts,
  onResolve,
  className = '',
}) => {
  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-12 text-center">
        <span className="text-6xl mb-4 block">✅</span>
        <div className="font-bold text-green-900">No Conflicts</div>
        <div className="text-sm text-green-700">All syncs completed successfully</div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-red-600 mb-6">⚠️ Sync Conflicts ({conflicts.length})</h3>

      <div className="space-y-4">
        {conflicts.map(conflict => (
          <div key={conflict.id} className="border-2 border-red-200 rounded-lg p-4">
            <div className="font-semibold mb-3">{conflict.platform} - {conflict.type}</div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-sm font-medium text-blue-900 mb-2">Local Version</div>
                <div className="text-sm text-gray-700">{JSON.stringify(conflict.local)}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-sm font-medium text-purple-900 mb-2">Remote Version</div>
                <div className="text-sm text-gray-700">{JSON.stringify(conflict.remote)}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onResolve(conflict.id, 'local')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Use Local
              </button>
              <button
                onClick={() => onResolve(conflict.id, 'remote')}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Use Remote
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyncConflicts;
