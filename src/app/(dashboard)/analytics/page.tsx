"use client";

import { useSession } from "next-auth/react";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import OverviewStats from "@/components/analytics/OverviewStats";
import TrendCharts from "@/components/analytics/TrendCharts";
import PlatformComparison from "@/components/analytics/PlatformComparison";
import CategoryBreakdown from "@/components/analytics/CategoryBreakdown";
import TimeSpentAnalysis from "@/components/analytics/TimeSpentAnalysis";
import ProductivityScore from "@/components/analytics/ProductivityScore";
import PredictionsCard from "@/components/analytics/PredictionsCard";
import InsightsCard from "@/components/analytics/InsightsCard";
import ExportAnalytics from "@/components/analytics/ExportAnalytics";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  // Sample insights data
  const insights = [
    {
      type: "success" as const,
      title: "Great Progress!",
      message: "You've completed 25% more problems this month compared to last month.",
    },
    {
      type: "info" as const,
      title: "Streak Opportunity",
      message: "You're 2 days away from your longest streak. Keep it up!",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Analytics</h1>
          <ExportAnalytics />
        </div>

        <div className="space-y-6">
          <AnalyticsFilters onFilterChange={() => { }} />
          <OverviewStats />
          <AnalyticsDashboard userId={userId} />

          <div className="grid lg:grid-cols-2 gap-6">
            <TrendCharts />
            <PlatformComparison />
            <CategoryBreakdown />
            <TimeSpentAnalysis />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <ProductivityScore />
            <PredictionsCard />
            <InsightsCard insights={insights} />
          </div>
        </div>
      </div>
    </div>
  );
}
