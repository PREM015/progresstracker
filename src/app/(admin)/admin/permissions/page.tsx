import { PermissionsList, PermissionMatrix } from '@/components/admin';
import Link from 'next/link';

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Permissions</h1>
          <p className="text-zinc-400">Manage system permissions and access control</p>
        </div>
        <Link
          href="/admin/permissions/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Permission
        </Link>
      </div>

      <PermissionMatrix />
      <PermissionsList />
    </div>
  );
}
