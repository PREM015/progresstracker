'use client';
export function BackupCreate() {
    const handleCreate = async () => { await fetch('/api/admin/database/backup', { method: 'POST' }); alert('Backup created'); };
    return <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Create Backup</button>;
}
export default BackupCreate;
