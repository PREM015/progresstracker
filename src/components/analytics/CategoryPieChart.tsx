'use client';

import  Card  from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CategoryData {
  platform: string;
  problems: number;
  time: number;
  count: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
        <p className="text-gray-500 text-center py-8">No category data available</p>
      </Card>
    );
  }

  // Group by category (you can customize this logic)
  const categoryMap: Record<string, number> = {};
  data.forEach((item) => {
    const category = getCategoryFromPlatform(item.platform);
    categoryMap[category] = (categoryMap[category] || 0) + item.problems;
  });

  const chartData = Object.entries(categoryMap).map(([category, value]) => ({
    name: category,
    value,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

function getCategoryFromPlatform(platform: string): string {
  const platformLower = platform.toLowerCase();
  
  if (['leetcode', 'codeforces', 'codechef', 'hackerrank', 'atcoder'].includes(platformLower)) {
    return 'DSA Practice';
  }
  if (['github', 'gitlab', 'bitbucket'].includes(platformLower)) {
    return 'Development';
  }
  if (['linkedin', 'naukri', 'internshala'].includes(platformLower)) {
    return 'Job Hunt';
  }
  if (['coursera', 'udemy', 'edx'].includes(platformLower)) {
    return 'Learning';
  }
  if (['devpost', 'hacktoberfest', 'mlh'].includes(platformLower)) {
    return 'Hackathons';
  }
  
  return 'Other';
}