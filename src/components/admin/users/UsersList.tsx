'use client';

import { useState, useEffect } from 'react';
import { useAdminUsers, AdminUser, AdminUserFilters } from '@/hooks/useAdmin';
import { useDebounce } from '@/hooks';
import { sanitizeSearchQuery } from '@/lib/sanitize';

interface UsersListProps {
    initialFilters?: any;
}

export function UsersList({ initialFilters = {} }: UsersListProps) {
    const [filters, setFilters] = useState<AdminUserFilters>({
        search: '',
        role: undefined,
        tier: '',
        status: undefined,
        page: 1,
        limit: 20,
    });

    const [localSearch, setLocalSearch] = useState('');
    const debouncedSearch = useDebounce(localSearch, 500);

    const {
        users,
        total,
        isLoading,
        error,
        banUser,
        unbanUser,
        deleteUser,
        verifyUser,
        impersonateUser
    } = useAdminUsers(filters);

    const totalPages = Math.ceil(total / (filters.limit || 20));

    // Sync debounced search with filters
    useEffect(() => {
        const sanitized = sanitizeSearchQuery(debouncedSearch);
        setFilters(prev => ({ ...prev, search: sanitized, page: 1 }));
    }, [debouncedSearch]);

    const handleBanUser = async (userId: string, name: string) => {
        if (!confirm(`Ban user ${name}?`)) return;
        const reason = prompt('Ban reason:');
        if (!reason) return;

        try {
            await banUser(userId, reason);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleUnbanUser = async (userId: string) => {
        try {
            await unbanUser(userId);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteUser = async (userId: string, name: string) => {
        if (!confirm(`Delete user ${name}? This cannot be undone.`)) return;
        try {
            await deleteUser(userId);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleVerifyUser = async (userId: string) => {
        try {
            await verifyUser(userId);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleImpersonateUser = async (userId: string, name: string) => {
        if (!confirm(`Impersonate ${name}? You will be logged in as them.`)) return;
        const reason = prompt('Impersonation reason:');
        if (!reason) return;

        try {
            const { token } = await impersonateUser(userId, reason);
            if (token) {
                // In a real app, you might use signIn from next-auth here
                // await signIn('credentials', { token, callbackUrl: '/dashboard' });
                window.location.href = `/api/auth/signin?token=${token}`; // Simplified for now
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const updateFilter = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />

                    <select
                        value={filters.role || ''}
                        onChange={(e) => updateFilter('role', e.target.value || undefined)}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        value={filters.tier || ''}
                        onChange={(e) => updateFilter('tier', e.target.value)}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Tiers</option>
                        <option value="FREE">Free</option>
                        <option value="STARTER">Starter</option>
                        <option value="PRO">Pro</option>
                        <option value="ENTERPRISE">Enterprise</option>
                    </select>

                    <button
                        onClick={() => {
                            setFilters({
                                search: '',
                                role: undefined,
                                tier: '',
                                status: undefined,
                                page: 1,
                                limit: 20
                            });
                            setLocalSearch('');
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>

                <div className="flex gap-4 mt-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.status === 'active'}
                            onChange={(e) => updateFilter('status', e.target.checked ? 'active' : undefined)}
                            className="w-4 h-4"
                        />
                        Active Only
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.status === 'banned'}
                            onChange={(e) => updateFilter('status', e.target.checked ? 'banned' : undefined)}
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-red-400">
                                        Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
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
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.subscription?.tier === 'FREE' ? 'bg-zinc-700 text-zinc-300' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {user.subscription?.tier || 'FREE'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1 text-sm">
                                                <div className="text-zinc-400">🔥 {user.stats?.streak || 0} day streak</div>
                                                <div className="text-zinc-400">📝 {user.stats?.entries || 0} entries</div>
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

                                                {!user.isVerified && (
                                                    <button
                                                        onClick={() => handleVerifyUser(user.id)}
                                                        className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                                                    >
                                                        Verify
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleImpersonateUser(user.id, user.name || 'User')}
                                                    className="px-3 py-1.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                                                    title="Impersonate"
                                                >
                                                    Login As
                                                </button>

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
                                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                                disabled={filters.page === 1}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-zinc-400">
                                Page {filters.page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, (prev.page || 1) + 1) }))}
                                disabled={filters.page === totalPages}
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
