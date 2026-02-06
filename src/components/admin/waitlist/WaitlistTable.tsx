'use client';

import { useEffect, useState } from 'react';

interface WaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  status: 'waiting' | 'invited' | 'joined';
  createdAt: string;
  invitedAt?: string | null;
  joinedAt?: string | null;
  position?: number | null;
}

export function WaitlistTable() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEntries();
  }, [status, search, page]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/waitlist?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch entries');
      const data = json?.data?.entries || [];
      setEntries(data);
      setTotalPages(json?.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, nextStatus: 'waiting' | 'invited' | 'joined') => {
    const previous = entries;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e)));
    try {
      const res = await fetch(`/api/admin/waitlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed to update entry');
      }
    } catch (err: any) {
      setEntries(previous);
      alert(err.message || 'Failed to update entry');
    }
  };

  const removeEntry = async (id: string) => {
    const previous = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/admin/waitlist?ids=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed to delete entry');
      }
    } catch (err: any) {
      setEntries(previous);
      alert(err.message || 'Failed to delete entry');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name"
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="invited">Invited</option>
            <option value="joined">Joined</option>
          </select>
          <button
            onClick={fetchEntries}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading waitlist...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Position</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Joined</th>
                  <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4 text-white">{entry.email}</td>
                    <td className="p-4 text-zinc-400">{entry.name || '—'}</td>
                    <td className="p-4 text-zinc-400">{entry.status}</td>
                    <td className="p-4 text-zinc-400">{entry.position ?? '—'}</td>
                    <td className="p-4 text-zinc-400">
                      {entry.joinedAt ? new Date(entry.joinedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.status === 'waiting' && (
                          <button
                            onClick={() => updateStatus(entry.id, 'invited')}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                          >
                            Invite
                          </button>
                        )}
                        {entry.status === 'invited' && (
                          <button
                            onClick={() => updateStatus(entry.id, 'joined')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Mark Joined
                          </button>
                        )}
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
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

export default WaitlistTable;
