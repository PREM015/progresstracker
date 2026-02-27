"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/billing/invoices/${invoiceId}`)
      .then(r => r.json())
      .then(data => setInvoice(data.invoice))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const downloadPDF = async () => {
    const res = await fetch(`/api/billing/invoices/${invoiceId}/download`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.number}.pdf`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">📄</span>
          <p className="mt-4 text-gray-500">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Invoice #{invoice.number}</h1>
          <button
            onClick={downloadPDF}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Download PDF
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">From</h3>
              <div className="text-gray-700">
                <div className="font-medium">ProgressTracker</div>
                <div className="text-sm">123 Main Street</div>
                <div className="text-sm">San Francisco, CA 94102</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Bill To</h3>
              <div className="text-gray-700">
                <div className="font-medium">{invoice.customerName}</div>
                <div className="text-sm">{invoice.customerEmail}</div>
                {invoice.customerAddress && (
                  <div className="text-sm">{invoice.customerAddress}</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-sm text-gray-600 mb-1">Invoice Date</div>
              <div className="font-medium">{new Date(invoice.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Due Date</div>
              <div className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <span className={`px-2 py-1 rounded text-sm ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                  invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }`}>
                {invoice.status}
              </span>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-right py-3 px-4">Unit Price</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="text-right py-3 px-4">{item.quantity}</td>
                  <td className="text-right py-3 px-4">${item.unitPrice}</td>
                  <td className="text-right py-3 px-4">${item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${invoice.subtotal}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${invoice.tax}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span className="text-indigo-600">${invoice.amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
