'use client';
import { useAdminDatabase } from '@/hooks/useAdminDatabase';


export function BackupRestore({ backupId }: { backupId: string }) {
    const { restoreBackup, isRestoringBackup } = useAdminDatabase();

    const handleRestore = async () => {
        if (!confirm('Restore backup? This will overwrite current data.')) return;
        try {
            await restoreBackup(backupId);
            alert('Backup restore initiated');
        } catch (err: any) {
            alert('Error restoring backup: ' + err.message);
        }
    };

    return (
        <button
            onClick={handleRestore}
            disabled={isRestoringBackup}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg disabled:opacity-50"
        >
            {isRestoringBackup ? 'Restoring...' : 'Restore'}
        </button>
    );
}
export default BackupRestore;
