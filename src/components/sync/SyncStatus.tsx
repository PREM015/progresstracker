'use client';

import React from 'react';

interface SyncStatusProps {
  platform: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync?: string;
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  platform,
  status,
  lastSync,
  className = '',
}) => {
  const statusConfig = {
    idle: { icon: '⏸️', color: 'text-gray-600', bg: 'bg-gray-100' },
    syncing: { icon: '🔄', color: 'text-blue-600', bg: 'bg-blue-100' },
    success: { icon: '✅', color: 'text-green-600', bg: 'bg-green-100' },
    error: { icon: '❌', color: 'text-red-600', bg: 'bg-red-100' },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-3 p-4 border rounded-lg ${className}`}>
      <span className={`text-2xl ${status === 'syncing' ? 'animate-spin' : ''}`}>
        {config.icon}
      </span>
      <div className="flex-1">
        <div className="font-semibold">{platform}</div>
        {lastSync && (
          <div className="text-sm text-gray-600">Last sync: {lastSync}</div>
        )}
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} capitalize`}>
        {status}
      </span>
    </div>
  );
};

export default SyncStatus;
