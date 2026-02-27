"use client";

import { useState, useEffect } from "react";

export default function AnalyticsComparisonPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/platforms/user')
      .then(r => r.json())
      .then(data => {
        setPlatforms(data.platforms || []);
        if (data.platforms?.length >= 2) {
          setSelectedPlatforms([data.platforms[0].id, data.platforms[1].id]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPlatforms.length >= 2) {
      fetch(`/api/analytics/comparison?platforms=${selectedPlatforms.join(',')}`)
        .then(r => r.json())
        .then(data => setComparisonData(data))
        .catch(err => console.error(err));
    }
  }, [selectedPlatforms]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Platform Comparison</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Select Platforms to Compare</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => {
                  if (selectedPlatforms.includes(platform.id)) {
                    setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                  } else if (selectedPlatforms.length < 3) {
                    setSelectedPlatforms([...selectedPlatforms, platform.id]);
                  }
                }}
                className={`p-4 rounded-lg border-2 transition ${selectedPlatforms.includes(platform.id)
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="text-3xl mb-2">{platform.platform?.icon || '🌐'}</div>
                <div className="font-medium text-gray-900">{platform.platform?.name}</div>
              </button>
            ))}
          </div>
        </div>

        {comparisonData && (
          <div className="grid md:grid-cols-3 gap-6">
            {selectedPlatforms.map(platformId => {
              const data = comparisonData[platformId];
              if (!data) return null;

              return (
                <div key={platformId} className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">{data.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{data.stats.problemsSolved || 0}</div>
                      <div className="text-sm text-gray-600">Problems Solved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{data.stats.commits || 0}</div>
                      <div className="text-sm text-gray-600">Commits</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{data.stats.activeDays || 0}</div>
                      <div className="text-sm text-gray-600">Active Days</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPlatforms.length < 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📊</span>
            <p className="mt-4 text-gray-500">Select at least 2 platforms to compare</p>
          </div>
        )}
      </div>
    </div>
  );
}
