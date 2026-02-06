'use client';

import { useEffect, useState } from 'react';

export function RolePermissions({ role }: { role?: 'admin' | 'user' }) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/permissions');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch permissions');
        setPermissions(json?.data || json || []);
      } catch (err) {
        console.error(err);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Permissions {role ? `(${role})` : ''}
      </h3>
      {loading ? (
        <div className="text-zinc-500">Loading permissions...</div>
      ) : permissions.length === 0 ? (
        <div className="text-zinc-500">No permissions available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {permissions.map((p) => (
            <div key={p.id || p.key} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <div className="text-white text-sm">{p.name || p.key}</div>
              {p.description && <div className="text-xs text-zinc-500">{p.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RolePermissions;
