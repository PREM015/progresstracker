import { ReportsList, ReportGenerator, ReportsAnalytics } from '@/components/admin';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Reports</h1>
        <p className="text-zinc-400">Generate and view analytics reports</p>
      </div>

      <ReportsAnalytics />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportsList />
        </div>
        <div>
          <ReportGenerator />
        </div>
      </div>
    </div>
  );
}
