'use client';

import { ReportsList } from '@/components/reports/ReportsList';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { ScheduledReports } from '@/components/reports/ScheduledReports';
import { MetaTags } from '@/components/seo/MetaTags';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <MetaTags title="Reports" description="Generate and view your progress reports." />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate insights and export your activity data.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ReportGenerator />
          <ReportsList />
        </div>
        <div>
          <ScheduledReports />
        </div>
      </div>
    </div>
  );
}
