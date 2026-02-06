import { RolesList } from '@/components/admin';
import Link from 'next/link';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Roles</h1>
          <p className="text-zinc-400">Manage user roles and permissions</p>
        </div>
        <Link
          href="/admin/roles/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Role
        </Link>
      </div>

      <RolesList />
    </div>
  );
}
