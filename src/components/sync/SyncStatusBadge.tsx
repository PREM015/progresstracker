'use client';

import React, { useState } from 'react';

interface SyncStatusBadgeProps {
    status: 'syncing' | 'success' | 'error' | 'idle';
    lastSyncedAt?: string;
    errorMessage?: string;
    onRetry?: () => void;
    className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
    status,
    lastSyncedAt,
    errorMessage,
    onRetry,
    className = '',
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const statusConfig = {
        syncing: {
            color: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '🔄',
            label: 'Syncing...',
        },
        success: {
            color: 'bg-green-100 text-green-700 border-green-200',
            icon: '✅',
            label: 'Synced',
        },
        error: {
            color: 'bg-red-100 text-red-700 border-red-200',
            icon: '❌',
            label: 'Sync Failed',
        },
        idle: {
            color: 'bg-gray-100 text-gray-700 border-gray-200',
            icon: '⏸️',
            label: 'Not Syncing',
        },
    };

    const config = statusConfig[status];

    const formatTime = (date?: string) => {
        if (!date) return 'Never';
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${config.color} ${status === 'syncing' && 'animate-pulse'
                    }`}
            >
                <span className="mr-2">{config.icon}</span>
                {config.label}
            </button>

            {showDetails && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64 z-10">
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Last Sync:</span>
                            <span className="font-medium">{formatTime(lastSyncedAt)}</span>
                        </div>
                        {status === 'error' && errorMessage && (
                            <div className="pt-2 border-t border-gray-200">
                                <p className="text-red-600 text-xs">{errorMessage}</p>
                                {onRetry && (
                                    <button
                                        onClick={onRetry}
                                        className="mt-2 w-full px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                        Retry Sync
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyncStatusBadge;
