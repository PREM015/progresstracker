'use client';
import { useState, useEffect } from 'react';
export function ChangelogList() {
    const [entries, setEntries] = useState<any[]>([]);
    useEffect(() => { fetch('/api/admin/changelog').then(r => r.json()).then(d => setEntries(d || [])); }, []);
    return <div className="space-y-4">{entries.map(e => <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="flex items-center justify-between mb-2"><span className="text-white font-semibold">v{e.version}</span><span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">{e.type}</span></div><p className="text-zinc-400 text-sm">{e.changes}</p></div>)}</div>;
}
export default ChangelogList;
