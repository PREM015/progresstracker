"use client";

import { useState, useEffect } from "react";

export default function AnalyticsTrendsPage() {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetch(`/api/analytics/trends?period=${period}`)
      .then(r => r.json())
      .then(data => setTrends(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [period]);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Trends Analysis</h1>
            <p className="text-gray-600 mt-2">Track your progress trends over time</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {!trends ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📈</span>
            <p className="mt-4 text-gray-500">No trends data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Problems Solved</span>
                  <span className={`text-sm font-medium ${trends.problemsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.problemsChange >= 0 ? '+' : ''}{trends.problemsChange}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{trends.totalProblems || 0}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Commits</span>
                  <span className={`text-sm font-medium ${trends.commitsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.commitsChange >= 0 ? '+' : ''}{trends.commitsChange}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{trends.totalCommits || 0}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Hours Tracked</span>
                  <span className={`text-sm font-medium ${trends.hoursChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.hoursChange >= 0 ? '+' : ''}{trends.hoursChange}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{trends.totalHours || 0}h</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Days</span>
                  <span className={`text-sm font-medium ${trends.activeDaysChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trends.activeDaysChange >= 0 ? '+' : ''}{trends.activeDaysChange}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{trends.activeDays || 0}</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">Activity Over Time</h2>
              <div className="h-64 flex items-end gap-2">
                {trends.dailyData?.map((day: any, idx: number) => {
                  const maxValue = Math.max(...trends.dailyData.map((d: any) => d.value));
                  const height = (day.value / maxValue) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-indigo-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.value}`}
                      />
                      <span className="text-xs text-gray-400">{new Date(day.date).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {trends.insights && trends.insights.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Insights</h2>
                <div className="space-y-3">
                  {trends.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-xl">💡</span>
                      <p className="text-sm text-gray-700">{insight}</p>
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
