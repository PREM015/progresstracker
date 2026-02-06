'use client';
import { useState, useEffect } from 'react';
export function GoalTemplatesList() {
    const [templates, setTemplates] = useState<any[]>([]);
    useEffect(() => { fetch('/api/admin/goal-templates').then(r => r.json()).then(d => setTemplates(d || [])); }, []);
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{templates.map(t => <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><h3 className="text-lg font-semibold text-white mb-2">{t.name}</h3><p className="text-zinc-400 text-sm mb-4">{t.description}</p><div className="flex justify-between items-center"><span className="text-indigo-400 font-semibold">{t.category}</span><a href={`/admin/goal-templates/${t.id}`} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded">Edit</a></div></div>)}</div>;
}
export default GoalTemplatesList;
