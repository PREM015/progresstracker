import { useAdminDatabase } from '@/hooks/useAdminDatabase';

export function BackupsList() {
    const { backups, isLoadingBackups: loading, deleteBackup } = useAdminDatabase();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this backup?')) return;
        try {
            await deleteBackup(id);
        } catch (err: any) {
            alert('Error deleting backup: ' + err.message);
        }
    };

    const handleDownload = (path: string) => {
        // Assuming path is accessible or we need a download endpoint
        // For now, let's assume it handles download via window.open or similar if it's a URL
        // If it's a file path, we might need an API endpoint to stream it.
        // I'll alert for now if not implemented.
        alert('Download not implemented using path: ' + path);
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading backups...</div>;

    return (
        <div className="space-y-4">
            {backups.map(b => (
                <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-white font-semibold">{b.name}</div>
                            <div className="text-zinc-500 text-sm">{new Date(b.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleDownload(b.path)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                            >
                                Download
                            </button>
                            <button
                                onClick={() => handleDelete(b.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            {backups.length === 0 && <div className="text-center text-zinc-500 p-8">No backups found</div>}
        </div>
    );
}
export default BackupsList;
