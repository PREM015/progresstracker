"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${code}`)
      .then(r => r.json())
      .then(data => setContent(data.content))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🔗</span>
          <p className="mt-4 text-gray-500">Shared content not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
          <p className="text-gray-600 mb-6">
            Shared by <strong>{content.sharedBy}</strong> on {new Date(content.sharedAt).toLocaleDateString()}
          </p>

          {content.type === 'GOAL' && (
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Progress</div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${(content.currentValue / content.targetValue) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {content.currentValue} / {content.targetValue}
                </div>
              </div>
              <p className="text-gray-700">{content.description}</p>
            </div>
          )}

          {content.type === 'ACHIEVEMENT' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl">{content.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{content.name}</h2>
                  <p className="text-gray-600">{content.description}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Earned on {new Date(content.earnedAt).toLocaleDateString()}
              </div>
            </div>
          )}

          {content.type === 'STATS' && (
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(content.stats || {}).map(([key, value]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</div>
                  <div className="text-2xl font-bold text-indigo-600">{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <a
            href="/register"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-block"
          >
            Create Your Own ProgressTracker Account
          </a>
        </div>
      </div>
    </div>
  );
}
