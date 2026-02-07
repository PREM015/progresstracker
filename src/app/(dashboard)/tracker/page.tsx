'use client';

import { ProblemList, Problem } from '@/components/tracker/ProblemList';
import { ProblemFilters } from '@/components/tracker/ProblemFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MetaTags } from '@/components/seo/MetaTags';

export default function TrackerPage() {
  const [problems, setProblems] = useState<Problem[]>([]); // Initialize empty for now

  // Handlers for filters (logic to be implemented with real data)
  const handleSearch = (val: string) => console.log('Search:', val);
  const handlePlatform = (val: string) => console.log('Platform:', val);
  const handleDifficulty = (val: string) => console.log('Difficulty:', val);
  const handleStatus = (val: string) => console.log('Status:', val);

  return (
    <div className="space-y-6">
      <MetaTags title="Tracker" description="Manage your problem solving journey" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Problem Tracker</h2>
          <p className="text-muted-foreground">
            Log and track your coding problems across all platforms.
          </p>
        </div>
        <Button asChild>
          <Link href="/tracker/new">
            <Plus className="mr-2 h-4 w-4" />
            Log Problem
          </Link>
        </Button>
      </div>

      <ProblemFilters
        onSearchChange={handleSearch}
        onPlatformChange={handlePlatform}
        onDifficultyChange={handleDifficulty}
        onStatusChange={handleStatus}
      />

      <ProblemList problems={problems} />
    </div>
  );
}
