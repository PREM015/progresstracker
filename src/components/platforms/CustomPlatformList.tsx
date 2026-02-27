'use client';

import React, { useState, useEffect } from 'react';

interface CustomPlatform {
  id: string;
  name: string;
  baseUrl: string;
  icon: string;
  color: string;
  isConnected: boolean;
  createdAt: string;
}

interface CustomPlatformListProps {
  className?: string;
}

export const CustomPlatformList: React.FC<CustomPlatformListProps> = ({
  className = '',
}) => {
  const [platforms, setPlatforms] = useState<CustomPlatform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platforms/custom')
      .then(r => r.json())
      .then(data => setPlatforms(data))
      .finally(() => setLoading(false));
  }, []);

  const deletePlatform = async (id: string) => {
    if (confirm('Delete this custom platform?')) {
      await fetch(`/api/platforms/custom/${id}`, { method: 'DELETE' });
      setPlatforms(platforms.filter(p => p.id !== id));
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Your Custom Platforms</h3>

      {platforms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <span className="text-5xl mb-4 block">🔗</span>
          <p className="text-gray-500">No custom platforms yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
              style={{ borderColor: platform.color + '40' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: platform.color + '20' }}
                  >
                    {platform.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{platform.name}</h4>
                    <p className="text-xs text-gray-500">{platform.baseUrl}</p>
                  </div>
                </div>
                <button
                  onClick={() => deletePlatform(platform.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full ${platform.isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {platform.isConnected ? '✓ Connected' : 'Not Connected'}
                </span>
                <span className="text-xs text-gray-500">
                  Added {new Date(platform.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomPlatformList;
