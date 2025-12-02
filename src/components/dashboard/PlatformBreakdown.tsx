'use client';

import  Card  from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PlatformStat {
  platform: string;
  problems: number;
  time: number;
  count: number;
}

interface PlatformBreakdownProps {
  data: PlatformStat[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Platform Breakdown</h3>
        <p className="text-gray-500 text-center py-8">No platform data available</p>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.platform,
    value: item.problems,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Platform Breakdown</h3>
      
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.platform} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium">{item.platform}</span>
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              {item.problems} problems
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}