import { MaintenanceList, MaintenanceActive, MaintenanceSchedule } from '@/components/admin';

export default function MaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Maintenance</h1>
        <p className="text-zinc-400">Schedule and manage maintenance windows</p>
      </div>

      <MaintenanceActive />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceSchedule />
        <MaintenanceList />
      </div>
    </div>
  );
}
