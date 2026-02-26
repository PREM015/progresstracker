import { ReportExport } from '@/components/admin';
import Link from 'next/link';

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/reports" className="text-zinc-400 hover:text-white">
          ← Back to Reports
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Report Details</h1>
        <p className="text-zinc-400">View and export report data</p>
      </div>

      <ReportExport reportType={id} />
    </div>
  );
}
