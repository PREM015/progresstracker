"use client";

import { useState, useEffect } from "react";

export default function AnalyticsHeatmapPage() {
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch(`/api/analytics/heatmap?year=${year}`)
      .then(r => r.json())
      .then(data => setHeatmapData(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getIntensityColor = (count: number, max: number) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = Math.ceil((count / max) * 4);
    const colors = ['bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'];
    return colors[intensity - 1] || colors[3];
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Activity Heatmap</h1>
            <p className="text-gray-600 mt-2">Visualize your daily activity patterns</p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            {[2024, 2023, 2022].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {!heatmapData || !heatmapData.days ? (
            <div className="text-center py-16">
              <span className="text-5xl">📅</span>
              <p className="mt-4 text-gray-500">No activity data for {year}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="inline-flex flex-col gap-1">
                  {/* Day labels */}
                  <div className="flex gap-1">
                    <div className="w-8"></div>
                    {months.map((month, idx) => (
                      <div key={idx} className="text-xs text-gray-400 w-12">{month}</div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  {days.map((day, dayIdx) => (
                    <div key={dayIdx} className="flex gap-1 items-center">
                      <div className="w-8 text-xs text-gray-400">{day}</div>
                      {heatmapData.weeks?.map((week: any, weekIdx: number) => {
                        const dayData = week.days[dayIdx];
                        const maxCount = heatmapData.maxCount || 1;
                        return (
                          <div
                            key={weekIdx}
                            className={`w-3 h-3 rounded-sm ${getIntensityColor(dayData?.count || 0, maxCount)}`}
                            title={`${dayData?.date}: ${dayData?.count || 0} activities`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm" />
                  <div className="w-3 h-3 bg-green-200 rounded-sm" />
                  <div className="w-3 h-3 bg-green-300 rounded-sm" />
                  <div className="w-3 h-3 bg-green-400 rounded-sm" />
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                </div>
                <span>More</span>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{heatmapData.totalDays || 0}</div>
                  <div className="text-sm text-gray-600">Active Days</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{heatmapData.totalActivities || 0}</div>
                  <div className="text-sm text-gray-600">Total Activities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{heatmapData.longestStreak || 0}</div>
                  <div className="text-sm text-gray-600">Longest Streak</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
