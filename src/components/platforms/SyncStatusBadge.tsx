'use client';

import React from 'react';

interface SyncStatusBadgeProps {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastSync?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  lastSync,
  size = 'md',
  className = '',
}) => {
  const statusConfig = {
    idle: { icon: '⏸️ ', label: 'Idle', color: 'bg-gray-100 text-gray-700' },
    syncing: { icon: '🔄', label: 'Syncing', color: 'bg-blue-100 text-blue-700' },
    synced: { icon: '✅', label: 'Synced', color: 'bg-green-100 text-green-700' },
    error: { icon: '❌', label: 'Error', color: 'bg-red-100 text-red-700' },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses[size]} ${status === 'syncing' ? 'animate-pulse' : ''
        }`}>
        <span className={status === 'syncing' ? 'animate-spin inline-block' : ''}>{config.icon}</span>
        {config.label}
      </span>
      {lastSync && size !== 'sm' && (
        <span className="text-xs text-gray-500">Last: {lastSync}</span>
      )}
    </div>
  );
};

export default SyncStatusBadge;
