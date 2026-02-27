import { MetricsDashboard, ApiMetrics, PerformanceMetrics, SystemMetrics, UserMetrics } from '@/components/admin';

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Metrics</h1>
        <p className="text-zinc-400">System performance and monitoring</p>
      </div>

      <MetricsDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ApiMetrics />
        <UserMetrics />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceMetrics />
        <SystemMetrics />
      </div>
    </div>
  );
}
