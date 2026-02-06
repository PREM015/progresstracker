'use client';

import { useEffect, useState } from 'react';

interface TicketDetailData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { name?: string | null; email?: string | null } | null;
  assignedTo?: { name?: string | null; email?: string | null } | null;
  slaStatus?: string;
}

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch ticket');
      const data = json?.data || json;
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async (next: { status?: string; priority?: string }) => {
    if (!ticket) return;
    const previous = { status: ticket.status, priority: ticket.priority };
    setTicket({ ...ticket, ...next });
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to update ticket');
      setTicket(json?.data || json);
    } catch (err: any) {
      setTicket({ ...ticket, ...previous });
      alert(err.message || 'Failed to update ticket');
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500">
        Loading ticket...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-red-400">
        {error}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-500">
        Ticket not found
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <div>
        <div className="text-xs text-zinc-500">Ticket #{ticket.ticketNumber}</div>
        <h2 className="text-2xl font-bold text-white">{ticket.subject}</h2>
        <div className="text-sm text-zinc-400">
          {ticket.user?.email || 'Unknown user'} - {new Date(ticket.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateTicket({ status: e.target.value });
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING">Waiting</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2">Priority</label>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              updateTicket({ priority: e.target.value });
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-2">SLA Status</label>
          <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white">
            {ticket.slaStatus || '-'}
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-200 whitespace-pre-wrap">
        {ticket.description}
      </div>
    </div>
  );
}

export default TicketDetail;
