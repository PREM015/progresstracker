import { WaitlistDashboard, WaitlistEntries, WaitlistInvite } from '@/components/admin';

export default function WaitlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Waitlist</h1>
        <p className="text-zinc-400">Manage waitlist signups and invitations</p>
      </div>

      <WaitlistDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WaitlistEntries />
        </div>
        <div>
          <WaitlistInvite />
        </div>
      </div>
    </div>
  );
}
