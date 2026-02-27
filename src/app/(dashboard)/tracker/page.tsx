
'use client';

import { ProblemList } from '@/components/tracker/ProblemList';
import { ProblemFilters } from '@/components/tracker/ProblemFilters';
import { TrackerDashboard } from '@/components/tracker/TrackerDashboard';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MetaTags } from '@/components/seo/MetaTags';

import { TrackerHeatmap } from '@/components/tracker/TrackerHeatmap';
import { TrackerRecentActivity } from '@/components/tracker/TrackerRecentActivity';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerFilter, TrackerEntry } from '@/types/tracker';

export default function TrackerPage() {
  const [filters, setFilters] = useState<TrackerFilter>({});

  // Use the hook to fetch real data based on filters
  const { entries, isLoading, error } = useTracker(filters);

  // Handlers for filters
  const handleSearch = (search: string) => setFilters(prev => ({ ...prev, search }));
  const handlePlatform = (platform: string) => setFilters(prev => ({ ...prev, platformIds: platform ? [platform] : undefined }));
  const handleDifficulty = (difficulty: string) => setFilters(prev => ({ ...prev, difficulty }));
  const handleCategory = (category: string) => setFilters(prev => ({
    ...prev,
    categories: category === 'all' ? undefined : [category as any]
  }));

  const handleStatus = (status: string) => setFilters(prev => ({
    ...prev,
    status: status === 'all' ? undefined : status as any
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <MetaTags title="Tracker" description="Manage your problem solving journey" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-4">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500">
            Activity Tracker
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Monitor your coding progression across 80+ platforms.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="rounded-xl border-zinc-200 dark:border-zinc-800 font-bold px-6 h-11 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
            <Link href="/tracker/sync" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync Status
            </Link>
          </Button>
          <Button asChild className="rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold px-6 h-11 hover:scale-[1.02] transition-transform shadow-lg shadow-zinc-200 dark:shadow-none">
            <Link href="/tracker/new" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Log Activity
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview & Heatmap */}
      <div className="grid gap-8 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-4 space-y-8">
          <TrackerDashboard />
          <div className="glass-card p-1">
            <TrackerHeatmap />
          </div>
        </div>
        <div className="col-span-full lg:col-span-3">
          <div className="glass-card h-full">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-lg">Recent Sprints</h3>
              <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mt-1">Live Feed</p>
            </div>
            <TrackerRecentActivity />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Daily Activity</h3>
        </div>

        <ProblemFilters
          onSearchChange={handleSearch}
          onPlatformChange={handlePlatform}
          onDifficultyChange={handleDifficulty}
          onStatusChange={handleStatus}
          onCategoryChange={handleCategory}
        />

        {error ? (
          <div className="text-red-500 p-4 border border-red-200 rounded-md">
            Error loading problems: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <ProblemList
            problems={isLoading ? [] : (entries as TrackerEntry[])}
          />
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-md" />)}
          </div>
        )}
      </div>
    </div>
  );
}
