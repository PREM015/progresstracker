'use client';
import { useAdminDatabase } from '@/hooks/useAdminDatabase';


export function BackupCreate() {
    const { createBackup, isCreatingBackup } = useAdminDatabase();

    const handleCreate = async () => {
        try {
            await createBackup();
            alert('Backup created');
        } catch (err: any) {
            alert('Error creating backup: ' + err.message);
        }
    };

    return (
        <button
            onClick={handleCreate}
            disabled={isCreatingBackup}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
            {isCreatingBackup ? 'Creating...' : 'Create Backup'}
        </button>
    );
}
export default BackupCreate;
