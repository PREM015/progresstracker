import { PlatformDetail, PlatformConfig, PlatformHealth } from '@/components/admin';
import Link from 'next/link';

export default function PlatformDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/platforms" className="text-zinc-400 hover:text-white">
          ← Back to Platforms
        </Link>
      </div>

      <PlatformDetail platformId={params.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlatformConfig platformId={params.id} />
        <PlatformHealth platformId={params.id} />
      </div>
    </div>
  );
}
