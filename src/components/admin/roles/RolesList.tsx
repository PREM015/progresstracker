'use client';

import { useAdminRoles, Role } from '@/hooks/useAdminAccess';

interface RolesListProps {
    onEdit: (role: Role) => void;
}

export function RolesList({ onEdit }: RolesListProps) {
    const { roles, isLoading: loading, error, deleteRole } = useAdminRoles();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this role?')) return;
        try {
            await deleteRole(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading roles...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading roles</div>;

    return (
        <div className="space-y-4">
            {roles.map((role) => (
                <div key={role.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                            <p className="text-zinc-400 text-sm mt-1">{role.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${role.isSystem ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-300'
                            }`}>
                            {role.isSystem ? 'System' : 'Custom'}
                        </span>
                    </div>

                    <div className="mb-4">
                        <div className="text-sm text-zinc-500 mb-2">Permissions ({role.permissions?.length || 0})</div>
                        <div className="flex flex-wrap gap-2">
                            {role.permissions?.slice(0, 5).map((perm: any) => (
                                <span key={perm.id} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                                    {perm.name}
                                </span>
                            ))}
                            {(role.permissions?.length || 0) > 5 && (
                                <span className="px-2 py-1 bg-zinc-800 text-zinc-500 rounded text-xs">
                                    +{role.permissions.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(role)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
                        >
                            Edit
                        </button>
                        {!role.isSystem && (
                            <button
                                onClick={() => handleDelete(role.id)}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {roles.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    No roles found
                </div>
            )}
        </div>
    );
}

export default RolesList;
