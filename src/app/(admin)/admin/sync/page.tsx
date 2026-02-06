import { SyncDashboard, SyncHistory, SyncManual, SyncSchedule } from '@/components/admin';

export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Sync</h1>
        <p className="text-zinc-400">Platform synchronization and data sync</p>
      </div>

      <SyncDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SyncManual />
        <SyncSchedule />
      </div>

      <SyncHistory />
    </div>
  );
}
