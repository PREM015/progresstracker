"use client";

import { useState, useEffect } from "react";

export default function AnalyticsInsightsPage() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/insights')
      .then(r => r.json())
      .then(data => setInsights(data))
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

  const getInsightIcon = (type: string) => {
    const icons: Record<string, string> = {
      achievement: '🏆',
      warning: '⚠️',
      tip: '💡',
      milestone: '🎯',
      streak: '🔥',
    };
    return icons[type] || '📊';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">AI-Powered Insights</h1>

        {!insights || !insights.items || insights.items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🤖</span>
            <p className="mt-4 text-gray-500">No insights available yet</p>
            <p className="text-sm text-gray-400 mt-2">Track more activity to generate insights</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.items.map((insight: any, idx: number) => (
              <div
                key={idx}
                className={`bg-white border-2 rounded-xl p-6 ${insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    insight.type === 'achievement' ? 'border-green-200 bg-green-50' :
                      'border-gray-200'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{insight.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-gray-700">{insight.description}</p>

                    {insight.actionable && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-1">Suggested Action:</div>
                        <p className="text-sm text-gray-700">{insight.action}</p>
                      </div>
                    )}

                    {insight.data && (
                      <div className="mt-4 flex gap-4 text-sm">
                        {Object.entries(insight.data).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-600">{key}: </span>
                            <span className="font-medium text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {insights && insights.summary && (
          <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3">Summary</h2>
            <p className="text-gray-700">{insights.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
