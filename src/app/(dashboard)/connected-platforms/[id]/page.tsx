"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function PlatformDetailPage() {
  const params = useParams();
  const platformId = params.id as string;

  const [platform, setPlatform] = useState<any>(null);
  const [userPlatform, setUserPlatform] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/platforms/${platformId}`).then(r => r.json()),
      fetch(`/api/platforms/${platformId}/stats`).then(r => r.json()),
      fetch(`/api/platforms/${platformId}/user`).then(r => r.json()).catch(() => ({ userPlatform: null })),
    ])
      .then(([platformData, statsData, userPlatformData]) => {
        setPlatform(platformData.platform);
        setStats(statsData.stats);
        setUserPlatform(userPlatformData.userPlatform);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [platformId]);

  const handleConnect = () => {
    window.location.href = `/platforms/connect?platform=${platformId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🔍</span>
          <p className="mt-4 text-gray-500">Platform not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{platform.icon || '🌐'}</div>
              <div>
                <h1 className="text-3xl font-bold">{platform.name}</h1>
                <p className="text-gray-600 mt-1">{platform.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded ${platform.category === 'DSA' ? 'bg-blue-100 text-blue-700' :
                      platform.category === 'GIT' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {platform.category}
                  </span>
                  {platform.supportsAutoSync && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Auto Sync
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!userPlatform ? (
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Connect
              </button>
            ) : (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                ✓ Connected
              </span>
            )}
          </div>
        </div>

        {userPlatform && stats && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-2xl mb-2">💡</div>
              <div className="text-2xl font-bold text-gray-900">{stats.problemsSolved || 0}</div>
              <div className="text-sm text-gray-600">Problems Solved</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-2xl font-bold text-gray-900">{stats.commits || 0}</div>
              <div className="text-sm text-gray-600">Commits</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-2xl mb-2">🔄</div>
              <div className="text-2xl font-bold text-gray-900">
                {userPlatform.lastSyncAt ? new Date(userPlatform.lastSyncAt).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-gray-600">Last Synced</div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">About {platform.name}</h2>
          <div className="space-y-3 text-sm">
            {platform.website && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Website</span>
                <a href={platform.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  Visit Site
                </a>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Sync Interval</span>
              <span className="text-gray-900">{platform.syncInterval} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Users</span>
              <span className="text-gray-900">{platform.totalUsers || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
