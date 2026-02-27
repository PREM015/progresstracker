'use client';

import React, { useState, useEffect } from 'react';

interface SyncRecord {
  id: string;
  platform: string;
  timestamp: string;
  status: 'success' | 'error';
  itemsSynced: number;
}

interface SyncHistoryProps {
  className?: string;
}

export const SyncHistory: React.FC<SyncHistoryProps> = ({
  className = '',
}) => {
  const [history, setHistory] = useState<SyncRecord[]>([]);

  useEffect(() => {
    fetch('/api/sync/history')
      .then(r => r.json())
      .then(data => setHistory(data));
  }, []);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Sync History</h3>

      <div className="space-y-3">
        {history.map((record) => (
          <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold text-gray-900">{record.platform}</div>
              <div className="text-sm text-gray-600">
                {new Date(record.timestamp).toLocaleString()} • {record.itemsSynced} items
              </div>
            </div>
            <span className={`text-2xl ${record.status === 'success' ? '✅' : '❌'}`} />
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📜</span>
            No sync history yet
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncHistory;
