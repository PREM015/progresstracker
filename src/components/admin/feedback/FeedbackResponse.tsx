'use client';

import { useState } from 'react';

export function FeedbackResponse({ feedbackId }: any) {
    const [response, setResponse] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!response.trim()) return;

        setSending(true);
        try {
            const res = await fetch(`/api/admin/feedback/${feedbackId}/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: response }),
            });
            if (!res.ok) throw new Error('Failed to send');
            alert('Response sent!');
            setResponse('');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Send Response</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your response..."
                    rows={5}
                    required
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                    type="submit"
                    disabled={sending || !response.trim()}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    {sending ? 'Sending...' : 'Send Response'}
                </button>
            </form>
        </div>
    );
}

export default FeedbackResponse;
