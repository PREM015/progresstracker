'use client';

import React from 'react';

interface SyncLog {
  id: string;
  platform: string;
  status: 'success' | 'error';
  timestamp: string;
  details: string;
  itemsProcessed: number;
}

interface SyncLogDetailProps {
  log: SyncLog;
  className?: string;
}

export const SyncLogDetail: React.FC<SyncLogDetailProps> = ({
  log,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Sync Log Details</h3>
        <span className={`text-2xl ${log.status === 'success' ? '✅' : '❌'}`} />
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-600">Platform</div>
          <div className="text-lg font-semibold">{log.platform}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Timestamp</div>
          <div className="text-lg">{new Date(log.timestamp).toLocaleString()}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Items Processed</div>
          <div className="text-lg font-semibold text-indigo-600">{log.itemsProcessed}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Details</div>
          <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">{log.details}</div>
        </div>
      </div>
    </div>
  );
};

export default SyncLogDetail;
