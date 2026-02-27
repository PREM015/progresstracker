'use client';

import { useState, useEffect } from 'react';

export function UserRoles({ userId }: { userId: string }) {
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [availableRoles, setAvailableRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        try {
            const [userRolesRes, allRolesRes] = await Promise.all([
                fetch(`/api/admin/users/${userId}/roles`),
                fetch('/api/admin/roles'),
            ]);

            const userRolesData = await userRolesRes.json();
            const allRolesData = await allRolesRes.json();

            setUserRoles(userRolesData || []);
            setAvailableRoles(allRolesData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const assignRole = async (roleId: string) => {
        try {
            await fetch(`/api/admin/users/${userId}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId }),
            });
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const removeRole = async (roleId: string) => {
        if (!confirm('Remove this role from user?')) return;
        try {
            await fetch(`/api/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading roles...</div>;
    }

    const assignedRoleIds = userRoles.map(r => r.id);
    const unassignedRoles = availableRoles.filter(r => !assignedRoleIds.includes(r.id));

    return (
        <div className="space-y-6">
            {/* Assigned Roles */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Assigned Roles</h3>
                <div className="space-y-2">
                    {userRoles.map(role => (
                        <div key={role.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                            <div>
                                <div className="text-white font-medium">{role.name}</div>
                                <div className="text-zinc-400 text-sm">{role.description}</div>
                            </div>
                            <button
                                onClick={() => removeRole(role.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    {userRoles.length === 0 && (
                        <div className="text-zinc-500 text-center py-4">No roles assigned</div>
                    )}
                </div>
            </div>

            {/* Available Roles */}
            {unassignedRoles.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Available Roles</h3>
                    <div className="space-y-2">
                        {unassignedRoles.map(role => (
                            <div key={role.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                                <div>
                                    <div className="text-white font-medium">{role.name}</div>
                                    <div className="text-zinc-400 text-sm">{role.description}</div>
                                </div>
                                <button
                                    onClick={() => assignRole(role.id)}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                                >
                                    Assign
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserRoles;
