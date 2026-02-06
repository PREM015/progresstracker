'use client';

import { useEffect, useState } from 'react';

type ReportType = 'weekly' | 'monthly' | 'yearly' | 'custom';

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getRangeForType(type: ReportType) {
  const end = new Date();
  const start = new Date(end);
  if (type === 'weekly') start.setDate(end.getDate() - 7);
  if (type === 'monthly') start.setDate(end.getDate() - 30);
  if (type === 'yearly') start.setDate(end.getDate() - 365);
  return { start, end };
}

export function ReportBuilder() {
  const [type, setType] = useState<ReportType>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [userIds, setUserIds] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const range = getRangeForType(type);
    setPeriodStart(toInputValue(range.start));
    setPeriodEnd(toInputValue(range.end));
  }, [type]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setResult({ status: 'queued' });
    try {
      const ids = userIds
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          userIds: ids.length > 0 ? ids : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to generate report');

      setResult(json?.data || json);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      setResult(null);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Report Builder</h3>
        <p className="text-sm text-zinc-500">Generate real reports from platform data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Report Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">User IDs (optional)</label>
          <input
            value={userIds}
            onChange={(e) => setUserIds(e.target.value)}
            placeholder="comma-separated user ids"
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Period Start</label>
          <input
            type="datetime-local"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Period End</label>
          <input
            type="datetime-local"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={generate}
          disabled={generating}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>

      {result && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
          <div className="text-zinc-400 mb-2">Result</div>
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default ReportBuilder;

