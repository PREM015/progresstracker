// ... (imports remain similar, adding recharts)
import React from 'react';
import { useTracker } from '@/hooks/useTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Flame, Zap, Trophy, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';

interface TrackerDashboardProps {
  className?: string;
}

export const TrackerDashboard: React.FC<TrackerDashboardProps> = ({
  className = '',
}) => {
  const { stats, summary, isLoadingStats, isLoadingSummary } = useTracker();

  const isLoading = isLoadingStats || isLoadingSummary;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // --- Prepare Data for Charts ---

  // 1. Difficulty Data (Pie Chart)
  // Note: summary?.byDifficulty isn't strictly in the interface returned by route yet, 
  // but we can compute it from stats or ensure backend returns it.
  // For now, let's use the summary structure we fixed or fallback to safe defaults.
  // The current `getSummary` returns `TrackerSummary` which has `totals`, `averages`, etc.
  // We might need to fetch breakdown if not present. 
  // Wait, I updated `api/tracker/summary/route.ts` to return `totals` and `averages`.
  // It DOES NOT return `byDifficulty` yet.
  // I need to update the backend route to return difficulty breakdown if I want to show it.
  // OR I can use the `computedStats` from `useTracker` if it has it.
  // `computedStats` in `useTracker.ts` calculates categories.

  // Let's check what `summary` actually has.
  // It has `totals`, `averages`, `changes`, `topPlatforms`, `topCategories`, `activeDays`.
  // It is missing `byDifficulty`.

  // Pivot: I will use `topCategories` for the Pie Chart for now, or `topPlatforms`.
  // Difficulty is crucial, but I don't have it in `summary` yet.
  // Actually, I can use `computedStats` from `useTracker` which iterates over `entries` to get categories.
  // But `entries` is paginated.

  // Let's stick to what we have in `summary`: `topPlatforms` and `topCategories`.

  const platformData = summary?.byPlatform.map((p: any) => ({
    name: p.platformName || p.platformId,
    value: p.problems
  })) || [];

  const categoryData = summary?.byCategory.map((c: any) => ({
    name: c.category,
    value: c.problems
  })) || [];

  // Colors for charts
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className={cn("space-y-6", className)}>
      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Contributions"
          value={summary?.totals.problems || 0}
          icon={Target}
          color="indigo"
          subtitle={`${summary?.totals.entries || 0} sync points`}
        />
        <StatCard
          label="Focus Time"
          value={`${Math.round((summary?.totals.time || 0) / 60)}h`}
          icon={Clock}
          color="orange"
          subtitle="All platform hours"
        />
        <StatCard
          label="Contribution Streak"
          value={summary?.activeDays || 0}
          icon={Flame}
          color="emerald"
          subtitle={`${summary?.streaks?.current || 0} day current`}
        />
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Bar Chart: Problems by Platform */}
        <div className="glass-card">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-lg tracking-tight">Platform Distribution</h3>
            <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mt-1">Multi-Source Sync</p>
          </div>
          <CardContent className="pt-8">
            {platformData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 700, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '12px' }}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="value" fill="#18181b" radius={[0, 8, 8, 0]} barSize={24} className="dark:fill-zinc-50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="Awaiting Data"
                description="Connect platforms to see breakdown"
                icon={Activity}
                className="py-12"
              />
            )}
          </CardContent>
        </div>

        {/* Pie Chart: Problems by Category */}
        <div className="glass-card">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-lg tracking-tight">Activity Focus</h3>
            <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mt-1">Skill Categorization</p>
          </div>
          <CardContent className="py-8">
            {categoryData.length > 0 ? (
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white dark:stroke-zinc-950 stroke-2" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', padding: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="Focus Area Empty"
                description="Complete goals to see categorization"
                icon={Target}
                className="py-12"
              />
            )}
          </CardContent>
        </div>

      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: any;
  color: 'indigo' | 'orange' | 'emerald';
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
  const colors = {
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {value}
              </span>
              {subtitle && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <div className={cn("p-2.5 rounded-xl", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrackerDashboard;
