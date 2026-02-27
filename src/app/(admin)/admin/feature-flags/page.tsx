import { FeatureFlagsList, FeatureFlagStats } from '@/components/admin';
import Link from 'next/link';

export default function FeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Feature Flags</h1>
          <p className="text-zinc-400">Manage feature toggles and rollouts</p>
        </div>
        <Link
          href="/admin/feature-flags/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Flag
        </Link>
      </div>

      <FeatureFlagStats />
      <FeatureFlagsList />
    </div>
  );
}
