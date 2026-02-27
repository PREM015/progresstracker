"use client";

import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function StreakLeaderboardPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold">🔥 Streak Leaderboard</h1>
                    <p className="text-gray-600 mt-2">Longest active streaks</p>
                </div>

                <LeaderboardTable category="streak" timeRange="all" />
            </div>
        </div>
    );
}
