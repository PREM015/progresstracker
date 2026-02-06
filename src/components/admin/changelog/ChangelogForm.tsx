'use client';
import { useState } from 'react';
export function ChangelogForm({ entry, onSave }: any) {
    const [data, setData] = useState({ version: entry?.version || '', changes: entry?.changes || '', type: entry?.type || 'FEATURE' });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(entry ? `/api/admin/changelog/${entry.id}` : '/api/admin/changelog', { method: entry ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onSave?.();
    };
    return <form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="Version" value={data.version} onChange={e => setData({ ...data, version: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><textarea placeholder="Changes" value={data.changes} onChange={e => setData({ ...data, changes: e.target.value })} rows={5} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><select value={data.type} onChange={e => setData({ ...data, type: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="FEATURE">Feature</option><option value="BUGFIX">Bug Fix</option><option value="IMPROVEMENT">Improvement</option></select><button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save</button></form>;
}
export default ChangelogForm;
