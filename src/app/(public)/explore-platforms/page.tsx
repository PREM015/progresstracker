"use client";

import { useState, useEffect } from "react";

export default function ExplorePlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetch('/api/platforms')
      .then(r => r.json())
      .then(data => setPlatforms(data.platforms || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', 'DSA', 'GIT', 'LEARNING', 'HACKATHON', 'OPENSOURCE', 'OTHER'];

  const filteredPlatforms = selectedCategory === 'all'
    ? platforms
    : platforms.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Explore Platforms</h1>
          <p className="text-xl opacity-90">Discover 20+ platforms you can track</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
            >
              {cat === 'all' ? 'All Platforms' : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPlatforms.map(platform => (
              <div key={platform.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                <div className="text-5xl mb-4">{platform.icon || '🌐'}</div>
                <h3 className="text-xl font-bold mb-2">{platform.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{platform.description}</p>

                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {platform.category}
                  </span>
                  {platform.supportsAutoSync && (
                    <span className="text-green-600">Auto Sync</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start tracking?</h2>
          <p className="text-gray-600 mb-6 text-lg">Sign up and connect your platforms today</p>
          <a
            href="/register"
            className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700"
          >
            Get Started Free →
          </a>
        </div>
      </main>
    </div>
  );
}
