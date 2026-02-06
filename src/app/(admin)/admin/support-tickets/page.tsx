import { SupportTicketsList, SupportTicketStats } from '@/components/admin';

export default function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Support Tickets</h1>
        <p className="text-zinc-400">Manage customer support requests</p>
      </div>

      <SupportTicketStats />
      <SupportTicketsList />
    </div>
  );
}
