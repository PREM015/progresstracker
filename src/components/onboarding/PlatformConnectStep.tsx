'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface PlatformConnectStepProps {
  onNext: () => void;
  className?: string;
}

export const PlatformConnectStep: React.FC<PlatformConnectStepProps> = ({
  onNext,
  className = '',
}) => {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlatforms = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/platforms/available?limit=4&sortBy=popularity');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch platforms');
        setPlatforms(json?.data?.platforms || []);
      } catch (err) {
        console.error(err);
        setPlatforms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  return (
    <div className={`bg-white rounded-2xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold mb-2">Connect Your Platforms</h2>
      <p className="text-gray-600 mb-8">Link your accounts to start tracking</p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {loading ? (
          <div className="col-span-full text-center text-gray-500">Loading platforms...</div>
        ) : platforms.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No platforms available</div>
        ) : (
          platforms.map((platform) => (
            <Link
              key={platform.id}
              href={`/platforms/connect?platform=${platform.id}`}
              className="flex items-center gap-4 p-4 border-2 rounded-xl hover:border-indigo-500 transition-colors"
            >
              <span className="text-4xl">{platform.icon || '??'}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold">{platform.displayName || platform.name}</div>
                <div className="text-sm text-gray-600">Connect to start syncing</div>
              </div>
              <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                Connect
              </span>
            </Link>
          ))
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
        >
          Skip for Now
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PlatformConnectStep;
