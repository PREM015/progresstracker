'use client';
import { useState } from 'react';
export function GoalTemplateForm({ template, onSave }: any) {
    const [data, setData] = useState({ name: template?.name || '', description: template?.description || '', category: template?.category || 'PERSONAL' });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(template ? `/api/admin/goal-templates/${template.id}` : '/api/admin/goal-templates', { method: template ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onSave?.();
    };
    return <form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="Name" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><textarea placeholder="Description" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><select value={data.category} onChange={e => setData({ ...data, category: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="PERSONAL">Personal</option><option value="PROFESSIONAL">Professional</option><option value="HEALTH">Health</option><option value="FINANCIAL">Financial</option></select><button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save</button></form>;
}
export default GoalTemplateForm;
