"use client";

import { StreakStats } from "@/components/streak";

export default function StreakPage() {
    // Mock data for now, would fetch from API
    const streakData = {
        currentStreak: 5,
        longestStreak: 12,
        totalActiveDays: 45
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Streak</h2>
                <p className="text-muted-foreground">Keep your momentum going!</p>
            </div>

            <StreakStats
                currentStreak={streakData.currentStreak}
                longestStreak={streakData.longestStreak}
                totalActiveDays={streakData.totalActiveDays}
            />

            <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center">
                <span className="text-4xl mb-4 block">📅</span>
                <h3 className="text-lg font-medium text-gray-900">Streak Calendar</h3>
                <p className="text-gray-500 mt-2">Activity history visualization coming soon</p>
            </div>
        </div>
    );
}
