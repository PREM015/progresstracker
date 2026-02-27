import { SystemLogsList, LogStats } from '@/components/admin';

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">System Logs</h1>
        <p className="text-zinc-400">Application logs and errors</p>
      </div>

      <LogStats />
      <SystemLogsList />
    </div>
  );
}
