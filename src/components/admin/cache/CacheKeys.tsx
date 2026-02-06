'use client';
import { useState, useEffect } from 'react';

export function CacheKeys() {
    const [keys, setKeys] = useState<string[]>([]);
    useEffect(() => {
        fetch('/api/admin/cache/keys').then(r => r.json()).then(d => setKeys(d || []));
    }, []);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cache Keys</h3>
            <div className="space-y-2">
                {keys.map(key => <div key={key} className="p-3 bg-zinc-800 rounded text-white font-mono text-sm">{key}</div>)}
            </div>
        </div>
    );
}
export default CacheKeys;
