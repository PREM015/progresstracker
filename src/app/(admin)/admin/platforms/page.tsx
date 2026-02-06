import { PlatformsList, PlatformStats } from '@/components/admin';
import Link from 'next/link';

export default function PlatformsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Platforms</h1>
          <p className="text-zinc-400">Connected platforms and integrations</p>
        </div>
        <Link
          href="/admin/platforms/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Add Platform
        </Link>
      </div>

      <PlatformStats />
      <PlatformsList />
    </div>
  );
}