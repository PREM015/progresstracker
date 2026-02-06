'use client';

import React from 'react';

interface SyncControlsProps {
  onSync: () => void;
  isSyncing?: boolean;
  className?: string;
}

export const SyncControls: React.FC<SyncControlsProps> = ({
  onSync,
  isSyncing = false,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Sync Controls</h3>

      <div className="space-y-3">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            ⚙️ Settings
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            📜 History
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncControls;
