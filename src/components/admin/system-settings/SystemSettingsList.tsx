'use client';

import { useEffect, useState } from 'react';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description?: string | null;
  category?: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export default function SystemSettingsList() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [category, isPublic]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (isPublic) params.set('isPublic', isPublic);

      const res = await fetch(`/api/admin/system-settings?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch settings');
      const data = json?.data?.settings || json?.settings || json?.data || [];
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Filter by category"
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
          />
          <select
            value={isPublic}
            onChange={(e) => setIsPublic(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="">All</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading settings...</div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No settings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Key</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Value</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Visibility</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Updated</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4 text-white font-mono text-sm">{s.key}</td>
                    <td className="p-4 text-zinc-400 text-sm max-w-md truncate">
                      {typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">{s.category || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          s.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {s.isPublic ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 text-sm">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
