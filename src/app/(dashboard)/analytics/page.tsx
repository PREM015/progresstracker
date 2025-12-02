'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ProgressChart } from '@/components/analytics/ProgressChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { PlatformBarChart } from '@/components/analytics/PlatformBarChart';
import { StreakCalendar } from '@/components/analytics/StreakCalendar';
import { MonthlyComparison } from '@/components/analytics/MonthlyComparison';
import { WeeklyReport } from '@/components/analytics/WeeklyReport';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ExportChart } from '@/components/analytics/ExportChart';
import  Card  from '@/components/ui/Card';
import  Spinner  from '@/components/ui/Spinner';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useStats } from '@/hooks/useStats';

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState<'problems' | 'time' | 'commits'>('problems');

  const { trends, metrics, insights, comparison, isLoading } = useAnalytics(selectedDays, selectedMetric);
  const { stats } = useStats(selectedDays);
  const { connectedPlatforms } = usePlatforms();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deep dive into your coding journey
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector
        onRangeChange={setSelectedDays}
        defaultDays={selectedDays}
      />

      {/* Metric Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="font-medium">Metric:</span>
          <div className="flex gap-2">
            {['problems', 'time', 'commits'].map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* AI Insights */}
      <InsightsPanel insights={insights} />

      {/* Weekly Report */}
      {comparison && <WeeklyReport comparison={comparison} />}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <div id="progress-chart">
          <ProgressChart
            data={trends}
            title={`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend`}
          />
          <div className="mt-2 flex justify-end">
            <ExportChart chartId="progress-chart" filename="progress-trend" />
          </div>
        </div>

        {/* Platform Bar Chart */}
        {stats.platformStats && stats.platformStats.length > 0 && (
          <div id="platform-chart">
            <PlatformBarChart data={stats.platformStats} />
            <div className="mt-2 flex justify-end">
              <ExportChart chartId="platform-chart" filename="platform-comparison" />
            </div>
          </div>
        )}

        {/* Category Pie Chart */}
        {stats.platformStats && stats.platformStats.length > 0 && (
          <div id="category-chart">
            <CategoryPieChart data={stats.platformStats} />
            <div className="mt-2 flex justify-end">
              <ExportChart chartId="category-chart" filename="category-distribution" />
            </div>
          </div>
        )}

        {/* Monthly Comparison */}
        {comparison && <MonthlyComparison comparison={comparison} />}
      </div>

      {/* Streak Calendar */}
      <div id="streak-calendar">
        <StreakCalendar userId="current-user" />
        <div className="mt-2 flex justify-end">
          <ExportChart chartId="streak-calendar" filename="streak-calendar" />
        </div>
      </div>

      {/* Summary Stats */}
      {metrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold">{metrics.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average</p>
              <p className="text-2xl font-bold">{metrics.average}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</p>
              <p className={`text-2xl font-bold ${metrics.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.growthRate}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak</p>
              <p className="text-2xl font-bold">{metrics.peak}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Days</p>
              <p className="text-2xl font-bold">{metrics.activeDays}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}