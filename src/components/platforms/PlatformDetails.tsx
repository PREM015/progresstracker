'use client';

import React, { useState, useEffect } from 'react';

interface PlatformDetailsProps {
  platformId: string;
  className?: string;
}

interface PlatformDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  stats: {
    totalUsers: number;
    avgSyncTime: string;
    lastSyncSuccess: string;
  };
  authRequired: string[];
  setupInstructions: string[];
}

export const PlatformDetails: React.FC<PlatformDetailsProps> = ({
  platformId,
  className = '',
}) => {
  const [platform, setPlatform] = useState<PlatformDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/platforms/${platformId}/details`)
      .then(r => r.json())
      .then(data => setPlatform(data))
      .finally(() => setLoading(false));
  }, [platformId]);

  if (loading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  if (!platform) return <div className="text-gray-500">Platform not found</div>;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">{platform.name}</h2>
      <p className="text-gray-600 mb-6">{platform.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{platform.stats.totalUsers.toLocaleString()}</div>
          <div className="text-xs text-gray-600">Users Connected</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{platform.stats.avgSyncTime}</div>
          <div className="text-xs text-gray-600">Avg Sync Time</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-sm font-bold text-purple-600">{platform.stats.lastSyncSuccess}</div>
          <div className="text-xs text-gray-600">Last Sync</div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 mb-3">Features</h3>
        <ul className="space-y-2">
          {platform.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Authentication Required */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 mb-3">Required Information</h3>
        <div className="flex flex-wrap gap-2">
          {platform.authRequired.map((req, idx) => (
            <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {req}
            </span>
          ))}
        </div>
      </div>

      {/* Setup Instructions */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Setup Instructions</h3>
        <ol className="space-y-2">
          {platform.setupInstructions.map((instruction, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <span className="text-gray-700">{instruction}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default PlatformDetails;
