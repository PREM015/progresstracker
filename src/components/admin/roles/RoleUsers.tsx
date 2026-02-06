'use client';

import { useEffect, useState } from 'react';

interface RoleUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

export function RoleUsers({ role = 'admin' }: { role?: 'admin' | 'user' }) {
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?role=${role}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch users');
        setUsers(json?.data?.users || []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [role]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        {role === 'admin' ? 'Admins' : 'Users'}
      </h3>
      {loading ? (
        <div className="text-zinc-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-zinc-500">No users found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Name</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Email</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Role</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="p-3 text-white">{u.name || '—'}</td>
                  <td className="p-3 text-zinc-400">{u.email}</td>
                  <td className="p-3 text-zinc-400">{u.role}</td>
                  <td className="p-3 text-zinc-400">{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="p-3 text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RoleUsers;
