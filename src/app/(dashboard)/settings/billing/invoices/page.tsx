"use client";

import { useState, useEffect } from "react";

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then(r => r.json())
      .then(data => setInvoices(data.invoices || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const downloadInvoice = async (invoiceId: string) => {
    const res = await fetch(`/api/billing/invoices/${invoiceId}/download`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Invoices</h1>

        {invoices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📄</span>
            <p className="mt-4 text-gray-500">No invoices yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">Invoice #{invoice.number}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Date: {new Date(invoice.date).toLocaleDateString()}</div>
                      <div>Period: {invoice.period}</div>
                      <div>Amount: ${invoice.amount}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/settings/billing/invoices/${invoice.id}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      View
                    </a>
                    <button
                      onClick={() => downloadInvoice(invoice.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
