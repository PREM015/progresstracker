'use client';

import { useState, useEffect } from 'react';

interface User {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    image: string | null;
    isActive: boolean;
    isBanned: boolean;
    isAdmin: boolean;
    role: string;
    currentStreak: number;
    totalPoints: number;
    tier: string | null;
    lastActiveAt: Date | null;
    createdAt: Date;
}

interface UsersListProps {
    initialFilters?: any;
}

export function UsersList({ initialFilters = {} }: UsersListProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        tier: '',
        isActive: undefined as boolean | undefined,
        isBanned: undefined as boolean | undefined,
    });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, [filters, page]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.role) params.append('role', filters.role);
            if (filters.tier) params.append('tier', filters.tier);
            if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
            if (filters.isBanned !== undefined) params.append('isBanned', String(filters.isBanned));
            params.append('page', String(page));
            params.append('limit', '20');

            const res = await fetch(`/api/admin/users?${params}`);
            if (!res.ok) throw new Error('Failed to fetch users');

            const data = await res.json();
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (userId: string, name: string) => {
        if (!confirm(`Ban user ${name}?`)) return;
        const reason = prompt('Ban reason:');
        if (!reason) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            if (!res.ok) throw new Error('Failed to ban user');
            fetchUsers();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleUnbanUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/unban`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to unban user');
            fetchUsers();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId: string, name: string) => {
        if (!confirm(`Delete user ${name}? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete user');
            fetchUsers();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />

                    <select
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Roles</option>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MODERATOR">Moderator</option>
                    </select>

                    <select
                        value={filters.tier}
                        onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Tiers</option>
                        <option value="FREE">Free</option>
                        <option value="STARTER">Starter</option>
                        <option value="PRO">Pro</option>
                        <option value="ENTERPRISE">Enterprise</option>
                    </select>

                    <button
                        onClick={() => setFilters({ search: '', role: '', tier: '', isActive: undefined, isBanned: undefined })}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>

                <div className="flex gap-4 mt-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.isActive === true}
                            onChange={(e) => setFilters({ ...filters, isActive: e.target.checked ? true : undefined })}
                            className="w-4 h-4"
                        />
                        Active Only
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.isBanned === true}
                            onChange={(e) => setFilters({ ...filters, isBanned: e.target.checked ? true : undefined })}
                            className="w-4 h-4"
                        />
                        Banned Only
                    </label>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">User</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Role</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Tier</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Stats</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-red-400">
                                        {error}
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${user.isBanned ? 'opacity-50' : ''
                                            }`}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name || 'User'}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                                                        {(user.name || user.email || 'U')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-white">{user.name || 'No name'}</div>
                                                    <div className="text-sm text-zinc-500">{user.email}</div>
                                                    {user.username && (
                                                        <div className="text-xs text-zinc-600">@{user.username}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.isAdmin ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.tier === 'FREE' ? 'bg-zinc-700 text-zinc-300' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {user.tier || 'FREE'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1 text-sm">
                                                <div className="text-zinc-400">🔥 {user.currentStreak} day streak</div>
                                                <div className="text-zinc-400">🏆 {user.totalPoints} pts</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {user.isBanned ? (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                                    Banned
                                                </span>
                                            ) : user.isActive ? (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`/admin/users/${user.id}`}
                                                    className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                                >
                                                    View
                                                </a>
                                                {user.isBanned ? (
                                                    <button
                                                        onClick={() => handleUnbanUser(user.id)}
                                                        className="px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                                                    >
                                                        Unban
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleBanUser(user.id, user.name || user.email || 'User')}
                                                        className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                                    >
                                                        Ban
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.name || user.email || 'User')}
                                                    className="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                        <div className="text-sm text-zinc-500">
                            Showing {users.length} of {total} users
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-zinc-400">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UsersList;
