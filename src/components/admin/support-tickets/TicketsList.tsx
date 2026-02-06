'use client';

import { useEffect, useState } from 'react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { name?: string | null; email?: string | null } | null;
  _count?: { replies?: number };
}

export function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [page, search, status, priority]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);

      const res = await fetch(`/api/admin/support-tickets?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch tickets');

      const data = json?.data || json || [];
      const pagination = json?.meta?.pagination || json?.pagination;

      setTickets(data);
      setTotalPages(pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, user, or ticket #"
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING">Waiting</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No tickets found</div>
        ) : (
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
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Updated</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <span className="font-mono text-sm text-indigo-400">
                        #{ticket.ticketNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium max-w-md truncate">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-zinc-500">{ticket.category || 'General'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white text-sm">{ticket.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-zinc-500">{ticket.user?.email || ''}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300">
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="p-4 text-white text-sm">{ticket._count?.replies || 0}</td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <a
                        href={`/admin/support-tickets/${ticket.id}`}
                        className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg inline-block"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50"
        >
          Previous
        </button>
        <div className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default TicketsList;

