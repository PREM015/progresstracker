'use client';

import  Card  from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PlatformData {
  platform: string;
  problems: number;
  time: number;
  count: number;
}

interface PlatformBarChartProps {
  data: PlatformData[];
}

export function PlatformBarChart({ data }: PlatformBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Platform Comparison</h3>
        <p className="text-gray-500 text-center py-8">No platform data available</p>
      </Card>
    );
  }

  const chartData = data
    .slice(0, 8) // Top 8 platforms
    .map((item) => ({
      name: item.platform,
      problems: item.problems,
      hours: Math.round(item.time / 60),
    }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Platform Comparison</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend />
          <Bar dataKey="problems" fill="#3B82F6" name="Problems" radius={[8, 8, 0, 0]} />
          <Bar dataKey="hours" fill="#10B981" name="Hours" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}