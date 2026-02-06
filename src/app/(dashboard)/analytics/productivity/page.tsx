"use client";

import { useState, useEffect } from "react";

export default function AnalyticsProductivityPage() {
  const [productivity, setProductivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/productivity')
      .then(r => r.json())
      .then(data => setProductivity(data))
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Productivity Score</h1>

        {!productivity ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📊</span>
            <p className="mt-4 text-gray-500">No productivity data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="text-sm text-gray-600 mb-2">Overall Productivity Score</div>
              <div className={`text-6xl font-bold ${getScoreColor(productivity.overallScore || 0)}`}>
                {productivity.overallScore || 0}
              </div>
              <div className="text-sm text-gray-500 mt-2">out of 100</div>

              <div className="mt-6 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${productivity.overallScore || 0}%` }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold mb-4">Consistency</h3>
                <div className={`text-3xl font-bold ${getScoreColor(productivity.consistencyScore || 0)}`}>
                  {productivity.consistencyScore || 0}
                </div>
                <p className="text-sm text-gray-600 mt-2">Based on daily activity patterns</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold mb-4">Efficiency</h3>
                <div className={`text-3xl font-bold ${getScoreColor(productivity.efficiencyScore || 0)}`}>
                  {productivity.efficiencyScore || 0}
                </div>
                <p className="text-sm text-gray-600 mt-2">Quality vs quantity of work</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold mb-4">Goal Progress</h3>
                <div className={`text-3xl font-bold ${getScoreColor(productivity.goalProgressScore || 0)}`}>
                  {productivity.goalProgressScore || 0}
                </div>
                <p className="text-sm text-gray-600 mt-2">Achievement of set goals</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Weekly Breakdown</h2>
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
                  const dayScore = productivity.weeklyBreakdown?.[day] || 0;
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-700">{day}</div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${dayScore}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-gray-900">{dayScore}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {productivity.recommendations && productivity.recommendations.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Recommendations</h2>
                <div className="space-y-3">
                  {productivity.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                      <span className="text-xl">💡</span>
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
