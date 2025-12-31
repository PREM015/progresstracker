'use client';

import Card from '@/components/ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PeriodStats {
  problems?: number;
  time?: number;
  days?: number;
}

interface ComparisonData {
  thisWeek?: PeriodStats;
  lastWeek?: PeriodStats;
  changes?: {
    problems?: number;
    time?: number;
  };
}

interface MonthlyComparisonProps {
  comparison?: ComparisonData | null;
}

export function MonthlyComparison({ comparison }: MonthlyComparisonProps) {
  // ✅ HARD GUARD — NO DATA
  if (
    !comparison ||
    !comparison.thisWeek ||
    !comparison.lastWeek ||
    !comparison.changes
  ) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">This Week vs Last Week</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Comparison data not available.
        </p>
      </Card>
    );
  }

  // ✅ SAFE VALUES (NO UNDEFINED ACCESS)
  const thisWeekProblems = comparison.thisWeek.problems ?? 0;
  const lastWeekProblems = comparison.lastWeek.problems ?? 0;

  const thisWeekTime = comparison.thisWeek.time ?? 0;
  const lastWeekTime = comparison.lastWeek.time ?? 0;

  const thisWeekDays = comparison.thisWeek.days ?? 0;
  const lastWeekDays = comparison.lastWeek.days ?? 0;

  const problemChange = comparison.changes.problems ?? 0;
  const timeChange = comparison.changes.time ?? 0;

  const metrics = [
    {
      label: 'Problems Solved',
      current: thisWeekProblems,
      previous: lastWeekProblems,
      change: problemChange,
    },
    {
      label: 'Time Invested',
      current: `${Math.round(thisWeekTime / 60)}h`,
      previous: `${Math.round(lastWeekTime / 60)}h`,
      change: timeChange,
    },
    {
      label: 'Active Days',
      current: thisWeekDays,
      previous: lastWeekDays,
      change:
        lastWeekDays === 0
          ? 0
          : Math.round(((thisWeekDays - lastWeekDays) / lastWeekDays) * 100),
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        This Week vs Last Week
      </h3>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const isPositive = metric.change >= 0;

          return (
            <div
              key={metric.label}
              className="flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold">{metric.current}</p>
                <p className="text-xs text-gray-500">
                  vs {metric.previous} last week
                </p>
              </div>

              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(metric.change)}%
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
