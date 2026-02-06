'use client';

import { useEffect, useState } from 'react';

export function ReportPreview({ reportId }: { reportId?: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/reports/${reportId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load report');
        setReport(json?.data || json);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (!reportId) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400">
        Select a report to preview.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500">
        Loading report preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-red-400">
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400">
        Report not found.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div>
        <div className="text-xs text-zinc-500">Report</div>
        <h3 className="text-lg font-semibold text-white">{report.title || report.name || 'Untitled'}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500">Type</div>
          <div className="text-white">{report.type || 'unknown'}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500">Status</div>
          <div className="text-white">{report.status || 'unknown'}</div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500">Period</div>
          <div className="text-white">
            {report.periodStart ? new Date(report.periodStart).toLocaleDateString() : '—'} -{' '}
            {report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : '—'}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500">User</div>
          <div className="text-white">{report.user?.email || report.userId || '—'}</div>
        </div>
      </div>

      {report.summary && (
        <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
          {report.summary}
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <div className="text-zinc-500 text-xs mb-2">Data</div>
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
          {JSON.stringify(report.data || report, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default ReportPreview;

