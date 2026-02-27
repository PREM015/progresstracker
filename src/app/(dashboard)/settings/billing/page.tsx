"use client";

import { useState, useEffect } from "react";
import { ProPlanCard } from "@/components/subscription/ProPlanCard";
import { PricingTable } from "@/components/subscription/PricingTable";
import { GlassCard } from "@/components/ui/GlassCard";
import { Download, FileText } from "lucide-react";

interface Invoice {
  id: string;
  date: string;
  amount: number;
  description: string;
  pdfUrl: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions/current').then(r => r.ok ? r.json() : null),
      fetch('/api/subscriptions/invoices').then(r => r.ok ? r.json() : null)
    ])
      .then(([subData, invData]) => {
        if (subData?.subscription) setSubscription(subData.subscription);
        if (invData?.invoices) setInvoices(invData.invoices);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const isPro = subscription?.tier === 'pro';

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-8 space-y-12 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Billing & Subscription
        </h1>
        <p className="text-gray-400">Manage your plan, billing details, and invoices.</p>
      </div>

      {/* Subscription Status */}
      <section>
        <ProPlanCard
          isPro={isPro}
          onUpgrade={() => console.log('Upgrade clicked')}
        />
      </section>

      {/* Pricing Options (Show if not Pro or just for reference) */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Available Plans</h2>
        <PricingTable />
      </section>

      {/* Invoices */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Billing History</h2>
        <GlassCard className="overflow-hidden p-0">
          <div className="p-6 space-y-1">
            <div className="grid gap-4">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">{invoice.description}</div>
                        <div className="text-sm text-gray-500">{new Date(invoice.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="font-bold text-white">${invoice.amount.toFixed(2)}</div>
                      <a
                        href={invoice.pdfUrl}
                        className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-500/10"
                      >
                        <Download className="w-4 h-4" />
                        <span>PDF</span>
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No invoices found.</p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
