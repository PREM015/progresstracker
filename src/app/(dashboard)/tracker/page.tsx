
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
    <div className="space-y-8">
      <MetaTags title="Tracker" description="Manage your problem solving journey" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Problem Tracker</h2>
          <p className="text-muted-foreground">
            Log and track your coding problems across all platforms.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/tracker/sync">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Status
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tracker/new">
              <Plus className="mr-2 h-4 w-4" />
              Log Problem
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview & Heatmap */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-4 space-y-6">
          <TrackerDashboard />
          <TrackerHeatmap />
        </div>
        <div className="col-span-full lg:col-span-3">
          <TrackerRecentActivity />
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
