import { DatabaseStats, DatabaseHealth } from '@/components/admin';
import Link from 'next/link';

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Database</h1>
          <p className="text-zinc-400">Database health and management</p>
        </div>
        <Link
          href="/admin/database/backups"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Manage Backups
        </Link>
      </div>

      <DatabaseHealth />
      <DatabaseStats />
    </div>
  );
}
