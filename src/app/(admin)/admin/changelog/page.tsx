import { ChangelogList } from '@/components/admin';
import Link from 'next/link';

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Changelog</h1>
          <p className="text-zinc-400">Product updates and releases</p>
        </div>
        <Link
          href="/admin/changelog/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Entry
        </Link>
      </div>

      <ChangelogList />
    </div>
  );
}
