'use client';

import  Card  from '@/components/ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonData {
  thisWeek: { problems: number; time: number; days: number };
  lastWeek: { problems: number; time: number; days: number };
  changes: { problems: number; time: number };
}

interface MonthlyComparisonProps {
  comparison: ComparisonData;
}

export function MonthlyComparison({ comparison }: MonthlyComparisonProps) {
  if (!comparison) {
    return null;
  }

  const metrics = [
    {
      label: 'Problems Solved',
      current: comparison.thisWeek.problems,
      previous: comparison.lastWeek.problems,
      change: comparison.changes.problems,
    },
    {
      label: 'Time Invested',
      current: `${Math.round(comparison.thisWeek.time / 60)}h`,
      previous: `${Math.round(comparison.lastWeek.time / 60)}h`,
      change: comparison.changes.time,
    },
    {
      label: 'Active Days',
      current: comparison.thisWeek.days,
      previous: comparison.lastWeek.days,
      change: Math.round(((comparison.thisWeek.days - comparison.lastWeek.days) / Math.max(comparison.lastWeek.days, 1)) * 100),
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">This Week vs Last Week</h3>
      
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
              <p className="text-2xl font-bold">{metric.current}</p>
              <p className="text-xs text-gray-500">vs {metric.previous} last week</p>
            </div>
            
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              metric.change >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {metric.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(metric.change)}%
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}