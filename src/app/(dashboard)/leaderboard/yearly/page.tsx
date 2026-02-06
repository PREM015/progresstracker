"use client";

import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function YearlyLeaderboardPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold">Yearly Leaderboard</h1>
                    <p className="text-gray-600 mt-2">Top performers this year</p>
                </div>

                <LeaderboardTable timeRange="all" />
            </div>
        </div>
    );
}
