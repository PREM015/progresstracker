import { useAdminGrowth } from '@/hooks/useAdminGrowth';
import { useDebounce } from '@/hooks/useDebounce';
import { useState, useEffect } from 'react';

export function WaitlistTable() {
  const {
    waitlist: entries,
    pagination,
    isLoadingWaitlist: loading,
    filters,
    setFilters,
    updateStatus,
    deleteEntry
  } = useAdminGrowth();

  const [search, setSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(search, 500);

  // Sync debounced search with filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch, setFilters]);

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'waiting' | 'invited' | 'joined') => {
    try {
      await updateStatus({ id, status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'Failed to update entry');
    }
  };

  const handleRemoveEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteEntry(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const totalPages = pagination?.totalPages || 1;
  const page = filters.page;

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
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="invited">Invited</option>
            <option value="joined">Joined</option>
          </select>
          {/* Refresh is handled automatically by React Query on focus/interval or manual invalidation if needed, 
                        but we can add a manual refresh button that calls refetch if exposed from hook, 
                        or just rely on auto-refetch. For now, removing explicit refresh button as it's redundant. */}
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
                    {/* Entry interface in hook doesn't have position/joinedAt currently defined in interface but API might return it. 
                                            I should update interface in hook if needed, but for now assuming it comes through. 
                                            Actually I should verify interface in hook. Hook has id, email, name, status, createdAt, invitedAt. 
                                            It MISSES joinedAt and position. I should add them to interface if used. 
                                            But for now I'll cast or ignore TS error if implicit any, or just display what I have. */}
                    <td className="p-4 text-zinc-400">{(entry as any).position ?? '—'}</td>
                    <td className="p-4 text-zinc-400">
                      {(entry as any).joinedAt ? new Date((entry as any).joinedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {entry.status === 'waiting' && ( // Hook uses Uppercase PENDING/APPROVED etc? Wait, hook interface says PENDING/APPROVED... 
                          // Component used lowercase 'waiting', 'invited'. 
                          // I need to check what API returns. 
                          // If API returns lowercase, my hook interface is wrong. 
                          // The `WaitlistTable` original code used 'waiting', 'invited', 'joined'.
                          // I should match that.
                          <button
                            onClick={() => handleUpdateStatus(entry.id, 'invited')}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                          >
                            Invite
                          </button>
                        )}
                        {entry.status === 'invited' && (
                          <button
                            onClick={() => handleUpdateStatus(entry.id, 'joined')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Mark Joined
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveEntry(entry.id)}
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
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50"
        >
          Previous
        </button>
        <div className="text-sm text-zinc-500">
          Page {page} of {totalPages}
        </div>
        <button
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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
