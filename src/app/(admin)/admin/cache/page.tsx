import { CacheDashboard, CacheKeys } from '@/components/admin';

export default function CachePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Cache Management</h1>
        <p className="text-zinc-400">Monitor and manage application cache</p>
      </div>

      <CacheDashboard />
      <CacheKeys />
    </div>
  );
}
