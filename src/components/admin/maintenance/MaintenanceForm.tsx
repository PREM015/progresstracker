'use client';
import { useState } from 'react';
export function MaintenanceForm({ window: w, onSave }: any) {
    const [data, setData] = useState({ title: w?.title || '', description: w?.description || '', startTime: w?.startTime || '', endTime: w?.endTime || '' });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(w ? `/api/admin/maintenance/${w.id}` : '/api/admin/maintenance', { method: w ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onSave?.();
    };
    return <form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="Title" value={data.title} onChange={e => setData({ ...data, title: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><textarea placeholder="Description" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><div className="grid grid-cols-2 gap-4"><input type="datetime-local" value={data.startTime} onChange={e => setData({ ...data, startTime: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><input type="datetime-local" value={data.endTime} onChange={e => setData({ ...data, endTime: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /></div><button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Schedule Maintenance</button></form>;
}
export default MaintenanceForm;
