'use client';

import { useAdminChangelog, ChangelogEntry } from '@/hooks/useAdminChangelog';

export function ChangelogList({ onEdit }: { onEdit?: (entry: ChangelogEntry) => void }) {
    const { entries, isLoading, deleteEntry, publishEntry } = useAdminChangelog();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this entry?')) return;
        try {
            await deleteEntry(id);
        } catch (err: any) {
            alert('Error deleting entry: ' + err.message);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            await publishEntry(id);
        } catch (err: any) {
            alert('Error publishing entry: ' + err.message);
        }
    };

    if (isLoading) return <div className="text-center text-zinc-500">Loading changelog...</div>;

    return (
        <div className="space-y-4">
            {entries.map(e => (
                <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">v{e.version}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${e.type === 'FEATURE' ? 'bg-green-500/20 text-green-400' :
                                e.type === 'BUGFIX' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>{e.type}</span>
                            {e.publishedAt && <span className="text-xs text-zinc-500">Published</span>}
                        </div>
                        <div className="flex gap-2">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(e)}
                                    className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:text-white rounded"
                                >
                                    Edit
                                </button>
                            )}
                            {!e.publishedAt && (
                                <button
                                    onClick={() => handlePublish(e.id)}
                                    className="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded"
                                >
                                    Publish
                                </button>
                            )}
                            <button
                                onClick={() => handleDelete(e.id)}
                                className="px-2 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm whitespace-pre-wrap">{e.changes}</p>
                </div>
            ))}
            {entries.length === 0 && <div className="text-center text-zinc-500 p-8">No changelog entries found</div>}
        </div>
    );
}
export default ChangelogList;
