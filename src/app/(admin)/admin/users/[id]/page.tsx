import { UserDetail } from '@/components/admin';
import Link from 'next/link';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-zinc-400 hover:text-white">
          ← Back to Users
        </Link>
      </div>

      <UserDetail userId={id} />
    </div>
  );
}