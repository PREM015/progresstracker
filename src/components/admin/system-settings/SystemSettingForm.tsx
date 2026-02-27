'use client';

import { useState } from 'react';

export default function SystemSettingForm({ onCreated }: { onCreated?: () => void }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    let parsedValue: any = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: parsedValue,
          description: description || undefined,
          category: category || undefined,
          isPublic,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create setting');
      setKey('');
      setValue('');
      setDescription('');
      setCategory('');
      setIsPublic(false);
      setMessage('Setting created');
      onCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={createSetting} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Create Setting</h3>
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="key (lowercase, dot or dash)"
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        required
      />
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value (string or JSON)"
        rows={3}
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
        required
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="description (optional)"
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="category (optional)"
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4"
        />
        Public setting
      </label>
      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Create Setting'}
      </button>
      {message && <div className="text-sm text-green-400">{message}</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </form>
  );
}
