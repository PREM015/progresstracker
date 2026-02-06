"use client";

import { useState, useEffect } from "react";

export default function ChangelogPage() {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then(r => r.json())
      .then(data => setVersions(data.versions || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-4">Changelog</h1>
        <p className="text-xl text-gray-600 mb-12">Track all updates and improvements to ProgressTracker</p>

        {versions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📋</span>
            <p className="mt-4 text-gray-500">No changelog entries yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {versions.map((version, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <span className="px-3 py-1 bg-indigo-600 text-white font-mono text-sm rounded">
                    v{version.version}
                  </span>
                  <span className="text-gray-500">
                    {new Date(version.releaseDate).toLocaleDateString()}
                  </span>
                </div>

                {version.features?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-green-700 mb-3">✨ New Features</h3>
                    <ul className="space-y-2">
                      {version.features.map((feature: string, i: number) => (
                        <li key={i} className="text-gray-700 pl-4">• {feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {version.improvements?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-blue-700 mb-3">🔧 Improvements</h3>
                    <ul className="space-y-2">
                      {version.improvements.map((improvement: string, i: number) => (
                        <li key={i} className="text-gray-700 pl-4">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {version.bugfixes?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-red-700 mb-3">🐛 Bug Fixes</h3>
                    <ul className="space-y-2">
                      {version.bugfixes.map((fix: string, i: number) => (
                        <li key={i} className="text-gray-700 pl-4">• {fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
