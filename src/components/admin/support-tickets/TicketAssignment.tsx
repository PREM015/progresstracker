'use client';

import { useState } from 'react';

export function TicketAssignment({ ticketId, onAssigned }: { ticketId: string; onAssigned?: () => void }) {
  const [assigneeId, setAssigneeId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assign = async () => {
    if (!assigneeId.trim()) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assigneeId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to assign ticket');
      setAssigneeId('');
      onAssigned?.();
    } catch (err: any) {
      setError(err.message || 'Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const clear = async () => {
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to clear assignee');
      onAssigned?.();
    } catch (err: any) {
      setError(err.message || 'Failed to clear assignee');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Assign Ticket</h3>
      <input
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        placeholder="Assignee user id"
        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
      />
      <div className="flex gap-3">
        <button
          onClick={assign}
          disabled={assigning || !assigneeId.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          {assigning ? 'Assigning...' : 'Assign'}
        </button>
        <button
          onClick={clear}
          disabled={assigning}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}

export default TicketAssignment;
