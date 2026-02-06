'use client';
export function BackupRestore({ backupId }: any) {
    const handleRestore = async () => { if (confirm('Restore backup?')) await fetch(`/api/admin/database/backup/${backupId}/restore`, { method: 'POST' }); };
    return <button onClick={handleRestore} className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg">Restore</button>;
}
export default BackupRestore;
