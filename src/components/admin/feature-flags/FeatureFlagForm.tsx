'use client';
import { useState } from 'react';
export function FeatureFlagForm({ flag, onSave }: any) {
    const [data, setData] = useState({ key: flag?.key || '', name: flag?.name || '', description: flag?.description || '', isEnabled: flag?.isEnabled || false });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(flag ? `/api/admin/feature-flags/${flag.key}` : '/api/admin/feature-flags', { method: flag ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onSave?.();
    };
    return <form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="Key" value={data.key} onChange={e => setData({ ...data, key: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><input type="text" placeholder="Name" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><textarea placeholder="Description" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><label className="flex items-center gap-2 text-white"><input type="checkbox" checked={data.isEnabled} onChange={e => setData({ ...data, isEnabled: e.target.checked })} className="w-4 h-4" />Enabled</label><button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save</button></form>;
}
export default FeatureFlagForm;
