import { BackupsList } from '@/components/admin';
import Link from 'next/link';

export default function BackupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/database" className="text-zinc-400 hover:text-white">
          ← Back to Database
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Database Backups</h1>
          <p className="text-zinc-400">Manage database backups and restores</p>
        </div>
      </div>

      <BackupsList />
    </div>
  );
}
