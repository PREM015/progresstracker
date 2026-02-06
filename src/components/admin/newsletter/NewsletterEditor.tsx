'use client';

import { useState } from 'react';

export function NewsletterEditor({ newsletterId, onSave }: { newsletterId?: string; onSave?: () => void }) {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!confirm(`Send newsletter to all subscribers?`)) return;

        setSending(true);
        try {
            const res = await fetch('/api/admin/newsletter/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, content }),
            });

            if (!res.ok) throw new Error('Failed to send');
            alert('Newsletter sent successfully!');
            setSubject('');
            setContent('');
            onSave?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Create & Send Newsletter</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Subject Line</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter newsletter subject..."
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Content (HTML supported)</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your newsletter content..."
                        rows={15}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSend}
                        disabled={!subject || !content || sending}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? 'Sending...' : 'Send to All Subscribers'}
                    </button>

                    <button
                        onClick={() => { setSubject(''); setContent(''); }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NewsletterEditor;
