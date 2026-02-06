'use client';
import { useState, useEffect } from 'react';
export function BackupsList() {
    const [backups, setBackups] = useState<any[]>([]);
    useEffect(() => { fetch('/api/admin/database/backups').then(r => r.json()).then(d => setBackups(d || [])); }, []);
    return <div className="space-y-4">{backups.map(b => <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="flex justify-between items-center"><div><div className="text-white font-semibold">{b.name}</div><div className="text-zinc-500 text-sm">{new Date(b.createdAt).toLocaleString()}</div></div><div className="flex gap-2"><button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Download</button><button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded">Delete</button></div></div></div>)}</div>;
}
export default BackupsList;
