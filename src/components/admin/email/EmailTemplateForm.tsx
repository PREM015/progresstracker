'use client';
import { useState } from 'react';
export function EmailTemplateForm({ template, onSave }: any) {
    const [data, setData] = useState({ name: template?.name || '', subject: template?.subject || '', body: template?.body || '' });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch(template ? `/api/admin/email/templates/${template.id}` : '/api/admin/email/templates', { method: template ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onSave?.();
    };
    return <form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="Name" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><input type="text" placeholder="Subject" value={data.subject} onChange={e => setData({ ...data, subject: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><textarea placeholder="Body (HTML)" value={data.body} onChange={e => setData({ ...data, body: e.target.value })} rows={10} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save Template</button></form>;
}
export default EmailTemplateForm;
