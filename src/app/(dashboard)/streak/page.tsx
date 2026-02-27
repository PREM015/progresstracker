"use client";

import { useStreak } from "@/hooks/useStreak";
import { StreakCard } from "@/components/streak/StreakCard";
import { StreakStats } from "@/components/streak/StreakStats";
import { StreakCalendar } from "@/components/streak/StreakCalendar";
import { StreakFreezeButton } from "@/components/streak/StreakFreezeButton";
import { StreakHistory } from "@/components/streak/StreakHistory";
import { StreakMilestone } from "@/components/streak/StreakMilestone";
import { Loader2 } from "lucide-react";

export default function StreakPage() {
    const {
        current,
        longest,
        freezeCount,
        isAtRisk,
        hoursUntilBreak,
        canUseFreeze,
        stats,
        history,
        isLoading,
        isLoadingStats,
        isUsingFreeze,
        useFreeze,
    } = useStreak();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Transform history for calendar
    const calendarHistory = (history || []).map((h: any) => ({
        date: typeof h.date === 'string' ? h.date : new Date(h.date).toISOString().split('T')[0],
        active: h.active ?? (h.length > 0 ? true : false),
    }));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Streak</h2>
                <p className="text-muted-foreground">Keep your momentum going!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Main Card + Freeze */}
                <div className="space-y-6">
                    <StreakCard
                        current={current}
                        longest={longest}
                        isAtRisk={isAtRisk}
                        hoursUntilBreak={hoursUntilBreak}
                        freezeCount={freezeCount}
                    />

                    <StreakFreezeButton
                        freezeCount={freezeCount}
                        canUseFreeze={canUseFreeze}
                        isUsingFreeze={isUsingFreeze}
                        onUseFreeze={useFreeze}
                    />
                </div>

                {/* Right Column: Stats + Calendar */}
                <div className="lg:col-span-2 space-y-6">
                    <StreakStats
                        currentStreak={current}
                        longestStreak={longest}
                        totalActiveDays={stats?.totalActiveDays ?? 0}
                        averageStreak={stats?.averageStreak ?? 0}
                        milestones={stats?.milestones}
                    />

                    <StreakCalendar history={calendarHistory} />
                </div>
            </div>

            {/* Bottom Row: Milestones + History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StreakMilestone
                    milestones={stats?.milestones}
                    currentStreak={current}
                />

                <StreakHistory
                    history={(history || []).map((h: any) => ({
                        startDate: h.startDate || h.date,
                        endDate: h.endDate || h.date,
                        length: h.length ?? h.days ?? 1,
                    }))}
                />
            </div>
        </div>
    );
}
