"use client";

import { useSession } from "next-auth/react";
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
import { BentoGrid, BentoGridItem } from "@/components/ui/BentoGrid";
import { MetaTags } from "@/components/seo/MetaTags";


export default function AnalyticsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  return (
    <div className="space-y-6">
      <MetaTags title="Analytics" description="Visualize your coding journey." />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-gray-400">Analytics</h1>
          <p className="text-zinc-500 dark:text-gray-400 mt-2">Deep dive into your performance metrics.</p>
        </div>
        <ExportAnalytics />
      </div>

      <AnalyticsFilters onFilterChange={() => { }} />
      <OverviewStats />

      <BentoGrid className="md:grid-rows-[20rem_20rem_auto] md:auto-rows-auto">
        {/* Row 1: Trends & Distribution */}
        <BentoGridItem
          className="md:col-span-2"
          header={<TrendCharts />}
        />
        <BentoGridItem
          className="md:col-span-1"
          header={<CategoryBreakdown />}
        />

        {/* Row 2: Platform & Time */}
        <BentoGridItem
          className="md:col-span-1"
          header={<PlatformComparison />}
        />
        <BentoGridItem
          className="md:col-span-2"
          header={<TimeSpentAnalysis />}
        />

        {/* Row 3: Insights & AI */}
        <BentoGridItem
          className="md:col-span-1"
          header={<ProductivityScore />}
        />
        <BentoGridItem
          className="md:col-span-1"
          header={<PredictionsCard />}
        />
        <BentoGridItem
          className="md:col-span-1"
          header={<InsightsCard />}
        />
      </BentoGrid>
    </div>
  );
}
