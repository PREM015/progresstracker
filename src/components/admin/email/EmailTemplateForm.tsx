'use client';

import { useState } from 'react';
import { useAdminEmailTemplates, EmailTemplate } from '@/hooks/useAdminCommunication';

export function EmailTemplateForm({ template, onSave }: { template?: EmailTemplate; onSave?: () => void }) {
    const { createTemplate, updateTemplate, isCreating, isUpdating } = useAdminEmailTemplates();
    const [data, setData] = useState({
        name: template?.name || '',
        subject: template?.subject || '',
        content: template?.content || '' // Using 'content' from interface, previously 'body' in component. Assuming 'content' is correct per interface.
    });

    const isSubmitting = isCreating || isUpdating;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (template) {
                await updateTemplate({ id: template.id, data });
            } else {
                await createTemplate(data);
            }
            onSave?.();
        } catch (err: any) {
            alert('Error saving template: ' + err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="Name"
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                required
            />
            <input
                type="text"
                placeholder="Subject"
                value={data.subject}
                onChange={e => setData({ ...data, subject: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                required
            />
            <textarea
                placeholder="Body (HTML)"
                value={data.content}
                onChange={e => setData({ ...data, content: e.target.value })}
                rows={10}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                required
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {isSubmitting ? 'Saving...' : 'Save Template'}
            </button>
        </form>
    );
}

export default EmailTemplateForm;
