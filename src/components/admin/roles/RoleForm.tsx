'use client';

import { useState, useEffect } from 'react';

export function RoleForm({ roleId, onSave }: { roleId?: string; onSave?: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
    });
    const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [roleId]);

    const fetchData = async () => {
        try {
            // Fetch available permissions
            const permsRes = await fetch('/api/admin/permissions');
            const perms = await permsRes.json();
            setAvailablePermissions(perms || []);

            // If editing, fetch role data
            if (roleId) {
                const roleRes = await fetch(`/api/admin/roles/${roleId}`);
                const role = await roleRes.json();
                setFormData({
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions.map((p: any) => p.id),
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = roleId ? `/api/admin/roles/${roleId}` : '/api/admin/roles';
            const res = await fetch(url, {
                method: roleId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save');
            alert(`Role ${roleId ? 'updated' : 'created'} successfully!`);
            onSave?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(id => id !== permId)
                : [...prev.permissions, permId]
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white">
                {roleId ? 'Edit Role' : 'Create New Role'}
            </h3>

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
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availablePermissions.map(perm => (
                        <label key={perm.id} className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg hover:bg-zinc-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.permissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <div className="text-white text-sm">{perm.name}</div>
                                {perm.description && (
                                    <div className="text-zinc-500 text-xs">{perm.description}</div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {saving ? 'Saving...' : (roleId ? 'Update Role' : 'Create Role')}
            </button>
        </form>
    );
}

export default RoleForm;
