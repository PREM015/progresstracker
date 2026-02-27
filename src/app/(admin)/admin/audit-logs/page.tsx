import { AuditLogsList } from '@/components/admin';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Audit Logs</h1>
        <p className="text-zinc-400">System activity and security logs</p>
      </div>

      <AuditLogsList />
    </div>
  );
}
