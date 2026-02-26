import { PlatformDetail, PlatformConfig, PlatformHealth } from '@/components/admin';
import Link from 'next/link';

export default async function PlatformDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/platforms" className="text-zinc-400 hover:text-white">
          ← Back to Platforms
        </Link>
      </div>

      <PlatformDetail platformId={id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlatformConfig platformId={id} />
        <PlatformHealth platformId={id} />
      </div>
    </div>
  );
}
