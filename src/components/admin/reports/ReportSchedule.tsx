'use client';

import { useEffect, useState } from 'react';

type QuickType = 'weekly' | 'monthly' | 'yearly';

function getQuickRange(type: QuickType) {
  const end = new Date();
  const start = new Date(end);
  if (type === 'weekly') start.setDate(end.getDate() - 7);
  if (type === 'monthly') start.setDate(end.getDate() - 30);
  if (type === 'yearly') start.setDate(end.getDate() - 365);
  return { start, end };
}

export function ReportSchedule() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [submitting, setSubmitting] = useState<QuickType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await fetch('/api/admin/reports?status=generating&limit=5&sortBy=createdAt&sortOrder=desc');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch queue');
      setQueue(json?.data || json || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const quickGenerate = async (type: QuickType) => {
    setSubmitting(type);
    setError(null);
    try {
      const { start, end } = getQuickRange(type);
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to generate report');
      await fetchQueue();
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Generate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['weekly', 'monthly', 'yearly'] as QuickType[]).map((type) => (
            <div key={type} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-2">{type.toUpperCase()}</div>
              <button
                onClick={() => quickGenerate(type)}
                disabled={submitting !== null}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                {submitting === type ? 'Generating...' : 'Generate Now'}
              </button>
            </div>
          ))}
        </div>
        {error && <div className="text-sm text-red-400 mt-3">{error}</div>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Generation Queue</h3>
        {loadingQueue ? (
          <div className="text-zinc-500">Loading queue...</div>
        ) : queue.length === 0 ? (
          <div className="text-zinc-500">No reports currently generating</div>
        ) : (
          <div className="space-y-3">
            {queue.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3"
              >
                <div>
                  <div className="text-white text-sm">{r.title || r.type}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-yellow-400">Generating</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportSchedule;

