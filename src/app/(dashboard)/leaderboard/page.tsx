"use client";

import { useState, useEffect } from "react";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import LeaderboardFilters from "@/components/leaderboard/LeaderboardFilters";
import TopPerformers from "@/components/leaderboard/LeaderboardCard";
import UserRankBadge from "@/components/leaderboard/UserRankBadge";

export default function LeaderboardPage() {
  const [filters, setFilters] = useState({ timeframe: "week", category: "overall" });
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<{ rank: number; change: number } | null>(null);

  useEffect(() => {
    // Fetch user's rank
    fetch('/api/leaderboard/rank')
      .then(r => r.json())
      .then(response => {
        if (response.success && response.data) {
          setUserRank(response.data);
        }
      })
      .catch(err => console.error('Failed to fetch user rank:', err))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            {!loading && userRank && (
              <div className="mt-2">
                <UserRankBadge rank={userRank.rank} showChange change={userRank.change} />
              </div>
            )}
          </div>
          <LeaderboardFilters
            timeframe={filters.timeframe}
            category={filters.category}
            onChange={setFilters}
          />
        </div>

        <div className="space-y-6">
          <LeaderboardTable />
        </div>
      </div>
    </div>
  );
}
