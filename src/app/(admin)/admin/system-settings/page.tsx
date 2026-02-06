import { SystemSettings } from '@/components/admin';

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-zinc-400">Configure system-wide settings</p>
      </div>

      <SystemSettings />
    </div>
  );
}
