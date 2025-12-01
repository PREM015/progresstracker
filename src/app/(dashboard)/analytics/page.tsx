import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProgressChart from "@/components/analytics/ProgressChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";
import PlatformBarChart from "@/components/analytics/PlatformBarChart";
import InsightsPanel from "@/components/analytics/InsightsPanel";

export const metadata = {
  title: "Analytics - CodeSync Pro",
  description: "Visualize your coding progress with charts",
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Visualize your coding journey with interactive charts
        </p>
      </div>

      {/* AI Insights */}
      <InsightsPanel />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Over Time */}
        <div className="lg:col-span-2">
          <ProgressChart />
        </div>

        {/* Category Distribution */}
        <CategoryPieChart />

        {/* Platform Comparison */}
        <PlatformBarChart />
      </div>
    </div>
  );
}