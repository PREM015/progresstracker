'use client';

import { useState } from 'react';

export function TicketReply({ ticketId, onSent }: { ticketId: string; onSent?: () => void }) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isInternal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to send reply');
      setMessage('');
      onSent?.();
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Reply</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Write a reply..."
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={isInternal}
          onChange={(e) => setIsInternal(e.target.checked)}
          className="h-4 w-4"
        />
        Internal note (only admins can see)
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={send}
          disabled={sending || !message.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Reply'}
        </button>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    </div>
  );
}

export default TicketReply;
