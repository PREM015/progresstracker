"use client";

import React from "react";

export default function StreakHistoryPage() {
    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Streak History</h1>
                    <p className="text-zinc-400 max-w-2xl">
                        View your past streaks and activity history.
                    </p>
                </div>
            </div>
            <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-xl bg-black/20 text-zinc-400">
                History feature is coming soon.
            </div>
        </div>
    );
}
