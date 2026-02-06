"use client";

import { useState, useEffect } from "react";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import StatsCards from "@/components/dashboard/StatsCards";
import QuickActions from "@/components/dashboard/QuickActions";
import ActivityChart from "@/components/dashboard/ActivityChart";
import GoalsSummary from "@/components/dashboard/GoalsSummary";
import PlatformSummary from "@/components/dashboard/PlatformSummary";
import RecentActivity from "@/components/dashboard/RecentActivity";
import StreakDisplay from "@/components/dashboard/StreakDisplay";
import HeatmapCalendar from "@/components/dashboard/HeatmapCalendar";
import AchievementsSummary from "@/components/dashboard/AchievementsSummary";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <WelcomeBanner />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <StatsCards />
            <ActivityChart />
            <QuickActions />
            <HeatmapCalendar />
          </div>

          <div className="space-y-6">
            <StreakDisplay />
            <GoalsSummary />
            <PlatformSummary />
            <AchievementsSummary />
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
