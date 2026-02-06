'use client';

import { useState, useEffect } from 'react';

interface SupportTicket {
    id: string;
    ticketNumber: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    category: string;
    user: {
        name: string | null;
        email: string | null;
    };
    assignedTo: {
        name: string | null;
        email: string | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _count: {
        replies: number;
    };
}

export function SupportTicketsList() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter.toUpperCase());

            const res = await fetch(`/api/admin/support-tickets?${params}`);
            if (!res.ok) throw new Error('Failed to fetch tickets');
            const data = await res.json();
            setTickets(data.tickets || data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            LOW: 'bg-zinc-700 text-zinc-300',
            MEDIUM: 'bg-blue-500/20 text-blue-400',
            HIGH: 'bg-yellow-500/20 text-yellow-400',
            URGENT: 'bg-red-500/20 text-red-400',
        };
        return colors[priority] || colors.MEDIUM;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            OPEN: 'bg-blue-500/20 text-blue-400',
            IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
            RESOLVED: 'bg-green-500/20 text-green-400',
            CLOSED: 'bg-zinc-700 text-zinc-300',
        };
        return colors[status] || colors.OPEN;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('open')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'open'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        Open
                    </button>
                    <button
                        onClick={() => setFilter('closed')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'closed'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        Closed
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    Loading tickets...
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    No support tickets found
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Ticket</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Subject</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">User</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Priority</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Replies</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Created</th>
                                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-sm text-indigo-400">#{ticket.ticketNumber}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white font-medium max-w-md truncate">{ticket.subject}</div>
                                            <div className="text-xs text-zinc-500">{ticket.category}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white text-sm">{ticket.user.name || 'No name'}</div>
                                            <div className="text-xs text-zinc-500">{ticket.user.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white text-sm">{ticket._count.replies}</td>
                                        <td className="p-4 text-zinc-400 text-sm">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <a
                                                href={`/admin/support-tickets/${ticket.id}`}
                                                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors inline-block"
                                            >
                                                View
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SupportTicketsList;
