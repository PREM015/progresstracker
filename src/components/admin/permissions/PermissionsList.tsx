'use client';

import { useState, useEffect } from 'react';

export function PermissionsList() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const res = await fetch('/api/admin/permissions');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setPermissions(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading permissions...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Permission</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Key</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Description</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {permissions.map((perm) => (
                        <tr key={perm.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="p-4 text-white font-medium">{perm.name}</td>
                            <td className="p-4 text-zinc-400 font-mono text-sm">{perm.key}</td>
                            <td className="p-4 text-zinc-400 text-sm">{perm.description || '-'}</td>
                            <td className="p-4">
                                <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm">
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {permissions.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No permissions found</div>
            )}
        </div>
    );
}

export default PermissionsList;
