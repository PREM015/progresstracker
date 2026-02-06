"use client";

import { useState, useEffect } from "react";

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions/current').then(r => r.json()),
      fetch('/api/subscriptions/invoices').then(r => r.json())
    ])
      .then(([subData, invData]) => {
        setSubscription(subData.subscription);
        setInvoices(invData.invoices || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Billing & Subscription</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Current Plan</h2>
          {subscription ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold capitalize">{subscription.tier} Plan</div>
                  <div className="text-gray-600">${subscription.price}/month</div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Change Plan
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Next billing date: {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">You're on the Free plan</p>
              <a href="/pricing" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Upgrade to Pro
              </a>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Billing History</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-500">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{new Date(invoice.date).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-600">{invoice.description}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold">${invoice.amount}</div>
                    <a href={invoice.pdfUrl} className="text-indigo-600 hover:underline text-sm">
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
