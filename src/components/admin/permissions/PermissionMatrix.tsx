'use client';

import { useState, useEffect } from 'react';

export function PermissionMatrix() {
    const [matrix, setMatrix] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        try {
            const res = await fetch('/api/admin/permissions/matrix');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setMatrix(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (roleId: string, permissionId: string, has: boolean) => {
        try {
            await fetch(`/api/admin/roles/${roleId}/permissions`, {
                method: has ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissionId }),
            });
            fetchMatrix();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading matrix...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Permission Matrix</h3>

            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-sm font-medium text-zinc-400 sticky left-0 bg-zinc-900">
                            Permission
                        </th>
                        {matrix?.roles?.map((role: any) => (
                            <th key={role.id} className="text-center p-3 text-sm font-medium text-zinc-400">
                                {role.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix?.permissions?.map((perm: any) => (
                        <tr key={perm.id} className="border-b border-zinc-800">
                            <td className="p-3 text-white text-sm sticky left-0 bg-zinc-900">
                                {perm.name}
                            </td>
                            {matrix.roles.map((role: any) => {
                                const hasPermission = role.permissions?.some((p: any) => p.id === perm.id);
                                return (
                                    <td key={role.id} className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={hasPermission}
                                            onChange={() => togglePermission(role.id, perm.id, hasPermission)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PermissionMatrix;
