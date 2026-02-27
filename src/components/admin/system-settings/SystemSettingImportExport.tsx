'use client';

import { useState } from 'react';

export default function SystemSettingImportExport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportSettings = async () => {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/system-settings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to export settings');
      const data = json?.data?.settings || [];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-settings-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export completed');
    } catch (err: any) {
      setError(err.message || 'Failed to export settings');
    } finally {
      setExporting(false);
    }
  };

  const importSettings = async () => {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(payload);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of settings');

      for (const item of parsed) {
        const res = await fetch('/api/admin/system-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: item.key,
            value: item.value,
            description: item.description,
            category: item.category,
            isPublic: Boolean(item.isPublic),
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json?.error?.message || `Failed to import ${item.key}`);
        }
      }
      setMessage('Import completed');
    } catch (err: any) {
      setError(err.message || 'Failed to import settings');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Import / Export</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={exportSettings}
          disabled={exporting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export JSON'}
        </button>
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Import JSON</label>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={6}
          placeholder='[{"key":"app.name","value":"Progress Tracker"}]'
          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        />
      </div>

      <button
        onClick={importSettings}
        disabled={importing || !payload.trim()}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg disabled:opacity-50"
      >
        {importing ? 'Importing...' : 'Import'}
      </button>

      {message && <div className="text-sm text-green-400">{message}</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
