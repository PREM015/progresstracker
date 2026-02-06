import { BillingDashboard, InvoicesList, SubscriptionsList, PaymentMethodsList, RevenueChart } from '@/components/admin';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Billing</h1>
        <p className="text-zinc-400">Revenue, subscriptions, and payments</p>
      </div>

      <BillingDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <PaymentMethodsList />
      </div>

      <SubscriptionsList />
      <InvoicesList />
    </div>
  );
}
