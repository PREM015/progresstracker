"use client";

import { useState, useEffect } from "react";

export default function AvailablePlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/platforms/available${filter !== 'all' ? `?category=${filter}` : ''}`)
      .then(r => r.json())
      .then(data => setPlatforms(data.platforms || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const categories = ['all', 'DSA', 'GIT', 'LEARNING', 'HACKATHON', 'OPENSOURCE', 'OTHER'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Available Platforms</h1>
          <p className="text-gray-600 mt-2">Discover platforms to track your progress</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${filter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {platforms.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔍</span>
            <p className="mt-4 text-gray-500">No platforms found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map(platform => (
              <a
                key={platform.id}
                href={`/platforms/${platform.id}`}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{platform.icon || '🌐'}</div>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {platform.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{platform.description}</p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{platform.totalUsers || 0} users</span>
                  {platform.supportsAutoSync && (
                    <span className="text-green-600">Auto Sync</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
