'use client';

import { useState, useEffect } from 'react';
import { Role, RoleInput, Permission } from '@/hooks/useAdminAccess';

interface RoleFormProps {
    role?: Role | null;
    availablePermissions: Permission[];
    onSubmit: (data: RoleInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function RoleForm({ role, availablePermissions, onSubmit, onCancel, isSubmitting = false }: RoleFormProps) {
    const [formData, setFormData] = useState<RoleInput>({
        name: '',
        description: '',
        permissionIds: [],
    });

    useEffect(() => {
        if (role) {
            setFormData({
                name: role.name,
                description: role.description || '',
                permissionIds: role.permissions.map((p) => p.id),
            });
        } else {
            setFormData({
                name: '',
                description: '',
                permissionIds: [],
            });
        }
    }, [role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
        } catch (err) {
            console.error(err);
        }
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permId)
                ? prev.permissionIds.filter(id => id !== permId)
                : [...prev.permissionIds, permId]
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role Name</label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">Permissions</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {availablePermissions.map(perm => (
                        <label key={perm.id} className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg hover:bg-zinc-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.permissionIds.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="text-white text-sm">{perm.name}</div>
                                {perm.description && (
                                    <div className="text-zinc-500 text-xs">{perm.description}</div>
                                )}
                            </div>
                        </label>
                    ))}
                    {availablePermissions.length === 0 && (
                        <p className="text-zinc-500 text-sm">No permissions available.</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
                </button>
            </div>
        </form>
    );
}

export default RoleForm;
