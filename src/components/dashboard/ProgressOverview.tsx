'use client';

import  Card  from '@/components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  problems: number;
  time: number;
  activeDays: number;
}

interface ProgressOverviewProps {
  data: MonthlyData[];
}

export function ProgressOverview({ data }: ProgressOverviewProps) {
  const chartData = data.map((item) => ({
    name: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    problems: item.problems,
    hours: Math.round(item.time / 60),
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Monthly Progress</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            tick={{ fill: '#6B7280' }}
          />
          <YAxis stroke="#6B7280" tick={{ fill: '#6B7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="problems"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Problems</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Hours</span>
        </div>
      </div>
    </Card>
  );
}