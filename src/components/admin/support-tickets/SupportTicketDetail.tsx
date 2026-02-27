'use client';

import { useState, useEffect } from 'react';

export function SupportTicketDetail({ ticketId }: { ticketId: string }) {
    const [ticket, setTicket] = useState<any>(null);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/admin/support-tickets/${ticketId}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setTicket(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const sendReply = async () => {
        if (!reply.trim()) return;

        setSending(true);
        try {
            await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: reply }),
            });
            setReply('');
            fetchTicket();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (status: string) => {
        try {
            await fetch(`/api/admin/support-tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            fetchTicket();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading ticket...</div>;
    }

    if (!ticket) {
        return <div className="p-8 text-center text-red-400">Ticket not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Ticket Header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{ticket.subject}</h2>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-zinc-400">From: {ticket.user.email}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={ticket.status}
                            onChange={(e) => updateStatus(e.target.value)}
                            className={`px-3 py-1 rounded text-sm font-medium ${ticket.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                    ticket.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                }`}
                        >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg">
                    <div className="text-white whitespace-pre-wrap">{ticket.message}</div>
                </div>
            </div>

            {/* Replies */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Conversation</h3>
                <div className="space-y-4 mb-6">
                    {ticket.replies?.map((r: any) => (
                        <div key={r.id} className={`p-4 rounded-lg ${r.isAdmin ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-zinc-950'
                            }`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-white font-medium">{r.isAdmin ? 'Admin' : ticket.user.email}</span>
                                <span className="text-zinc-500 text-sm">{new Date(r.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="text-zinc-300">{r.message}</div>
                        </div>
                    ))}
                </div>

                {/* Reply Form */}
                <div className="border-t border-zinc-800 pt-4">
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Type your reply..."
                        rows={4}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 mb-3"
                    />
                    <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SupportTicketDetail;
