'use client';

import React, { useState, useEffect } from 'react';

interface PlatformSummaryData {
  platforms: Array<{
    id: string;
    name: string;
    icon?: string | null;
    connected: boolean;
    lastSync: string;
    itemsCount: number;
  }>;
}

interface PlatformSummaryProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

export const PlatformSummary: React.FC<PlatformSummaryProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<PlatformSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/platforms/summary');
        const json = (await res.json()) as ApiSuccess<PlatformSummaryData>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch platform summary');
        }

        if (isMounted) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Failed to load platform summary:', error);
        if (isMounted) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (!data || !data.platforms) return null;

  const connectedCount = data.platforms.filter(p => p.connected).length;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Platforms</h3>
        <span className="text-sm text-gray-600">
          {connectedCount}/{data.platforms.length} connected
        </span>
      </div>

      <div className="space-y-3">
        {data.platforms.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-sm uppercase tracking-widest mb-2">No Connections</div>
            <div className="text-sm">Connect a platform to start syncing.</div>
          </div>
        ) : (
          data.platforms.map((platform) => (
            <div
              key={platform.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 ${platform.connected
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
                }`}
            >
              <div className="text-xl font-semibold text-gray-700">
                {platform.icon || platform.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{platform.name}</div>
                <div className="text-xs text-gray-600">
                  {platform.connected ? (
                    <>Last sync: {new Date(platform.lastSync).toLocaleString()} - {platform.itemsCount} items</>
                  ) : (
                    'Not connected'
                  )}
                </div>
              </div>
              <div className={`text-xs px-3 py-1 rounded-full ${platform.connected
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-600'
                }`}
              >
                {platform.connected ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlatformSummary;
