'use client';
import { useState, useEffect } from 'react';
export function EmailTemplatesList() {
    const [templates, setTemplates] = useState<any[]>([]);
    useEffect(() => { fetch('/api/admin/email/templates').then(r => r.json()).then(d => setTemplates(d || [])); }, []);
    return <div className="space-y-4">{templates.map(t => <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="flex justify-between items-center"><div><div className="text-white font-semibold">{t.name}</div><div className="text-zinc-500 text-sm">{t.subject}</div></div><a href={`/admin/email/templates/${t.id}`} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg">Edit</a></div></div>)}</div>;
}
export default EmailTemplatesList;
