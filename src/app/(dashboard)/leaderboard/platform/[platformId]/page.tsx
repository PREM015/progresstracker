"use client";

import { useParams } from "next/navigation";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function PlatformLeaderboardPage() {
    const params = useParams();
    const platformId = params.platformId as string;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold">Platform Leaderboard</h1>
                    <p className="text-gray-600 mt-2">Top performers on this platform</p>
                </div>

                <LeaderboardTable category={platformId} timeRange="all" />
            </div>
        </div>
    );
}
