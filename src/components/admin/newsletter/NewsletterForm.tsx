'use client';

import { useState } from 'react';

export function NewsletterForm({ newsletter, onSave }: any) {
    const [subject, setSubject] = useState(newsletter?.subject || '');
    const [content, setContent] = useState(newsletter?.content || '');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const res = await fetch('/api/admin/newsletter/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, content }),
            });
            if (!res.ok) throw new Error('Failed to send');
            alert('Newsletter sent!');
            onSave?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            />
            <textarea
                placeholder="Content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            />
            <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {sending ? 'Sending...' : 'Send Newsletter'}
            </button>
        </form>
    );
}

export default NewsletterForm;
