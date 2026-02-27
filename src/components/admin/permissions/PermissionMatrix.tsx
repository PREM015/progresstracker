'use client';

import { useAdminPermissionMatrix } from '@/hooks/useAdminAccess';

export function PermissionMatrix() {
    const { matrix, isLoading, togglePermission } = useAdminPermissionMatrix();

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Loading matrix...</div>;
    }

    const handleToggle = async (roleId: string, permissionId: string, has: boolean) => {
        try {
            await togglePermission({ roleId, permissionId, hasPermission: has });
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

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
                            {matrix?.roles?.map((role: any) => {
                                const hasPermission = role.permissions?.some((p: any) => p.id === perm.id);
                                return (
                                    <td key={role.id} className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={hasPermission}
                                            onChange={() => handleToggle(role.id, perm.id, hasPermission)}
                                            className="w-4 h-4 cursor-pointer rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
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
