'use client';

import  Card  from '@/components/ui/Card';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';

interface WeeklyReportProps {
  comparison: any;
}

export function WeeklyReport({ comparison }: WeeklyReportProps) {
  if (!comparison) {
    return null;
  }

  const stats = [
    {
      icon: <Target className="w-5 h-5 text-blue-600" />,
      label: 'Problems This Week',
      value: comparison.thisWeek.problems,
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      icon: <Clock className="w-5 h-5 text-green-600" />,
      label: 'Hours Invested',
      value: `${Math.round(comparison.thisWeek.time / 60)}h`,
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      label: 'Active Days',
      value: comparison.thisWeek.days,
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      label: 'Growth Rate',
      value: `${comparison.changes.problems}%`,
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Weekly Performance Report</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-lg ${stat.bgColor} flex items-center justify-center mb-2`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}