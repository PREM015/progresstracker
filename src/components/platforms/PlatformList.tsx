'use client';

import React, { useState, useEffect } from 'react';

interface Platform {
  id: string;
  name: string;
  slug: string;
  isConnected: boolean;
}

interface PlatformListProps {
  category?: string;
  className?: string;
}

export const PlatformList: React.FC<PlatformListProps> = ({
  category,
  className = '',
}) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'connected' | 'available'>('all');

  useEffect(() => {
    fetch(`/api/platforms${category ? `?category=${category}` : ''}`)
      .then(r => r.json())
      .then(data => setPlatforms(data))
      .finally(() => setLoading(false));
  }, [category]);

  const filteredPlatforms = platforms.filter(p => {
    if (filter === 'connected') return p.isConnected;
    if (filter === 'available') return !p.isConnected;
    return true;
  });

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'connected', 'available'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlatforms.map(platform => (
          <div key={platform.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{platform.name}</h3>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-3 py-1 rounded-full ${platform.isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                {platform.isConnected ? '✓ Connected' : 'Not Connected'}
              </span>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                {platform.isConnected ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformList;
