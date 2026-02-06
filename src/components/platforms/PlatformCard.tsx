'use client';

import React from 'react';

interface Platform {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  category: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  stats?: {
    problemsSolved?: number;
    commits?: number;
    points?: number;
  };
}

interface PlatformCardProps {
  platform: Platform;
  className?: string;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  className = '',
  onConnect,
  onDisconnect,
  onViewDetails,
}) => {
  const formatLastSync = (date?: string) => {
    if (!date) return 'Never';
    const diffMs = new Date().getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={`bg-white border-2 ${platform.isConnected ? 'border-green-200' : 'border-gray-200'
        } rounded-xl p-6 hover:shadow-lg transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {platform.icon ? (
            <img
              src={platform.icon}
              alt={platform.name}
              className="w-12 h-12 rounded-lg"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: platform.color || '#6366F1' }}
            >
              {platform.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
            <p className="text-xs text-gray-500">{platform.category}</p>
          </div>
        </div>

        {/* Connection Status */}
        {platform.isConnected && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            ✓ Connected
          </span>
        )}
      </div>

      {/* Stats */}
      {platform.isConnected && platform.stats && (
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          {platform.stats.problemsSolved !== undefined && (
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">
                {platform.stats.problemsSolved}
              </div>
              <div className="text-xs text-gray-500">Problems</div>
            </div>
          )}
          {platform.stats.commits !== undefined && (
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">
                {platform.stats.commits}
              </div>
              <div className="text-xs text-gray-500">Commits</div>
            </div>
          )}
          {platform.stats.points !== undefined && (
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">
                {platform.stats.points}
              </div>
              <div className="text-xs text-gray-500">Points</div>
            </div>
          )}
        </div>
      )}

      {/* Last Synced */}
      {platform.isConnected && (
        <div className="text-xs text-gray-500 mb-4">
          Last synced: {formatLastSync(platform.lastSyncedAt)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {platform.isConnected ? (
          <>
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(platform.id)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                View Details
              </button>
            )}
            {onDisconnect && (
              <button
                onClick={() => onDisconnect(platform.id)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium"
              >
                Disconnect
              </button>
            )}
          </>
        ) : (
          <>
            {onConnect && (
              <button
                onClick={() => onConnect(platform.id)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Connect
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(platform.id)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Learn More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformCard;
