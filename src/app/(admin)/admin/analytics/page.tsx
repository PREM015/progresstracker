import { AdminAnalyticsDashboard, EngagementMetrics, PlatformAnalytics, RevenueAnalytics } from '@/components/admin';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-zinc-400">Platform analytics and insights</p>
      </div>

      <AdminAnalyticsDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementMetrics />
        <PlatformAnalytics />
      </div>

      <RevenueAnalytics />
    </div>
  );
}
