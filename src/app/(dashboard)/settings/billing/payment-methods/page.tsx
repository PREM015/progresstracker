"use client";

import { useState, useEffect } from "react";

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/billing/payment-methods')
      .then(r => r.json())
      .then(data => setMethods(data.methods || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const addPaymentMethod = async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/billing/payment-methods/setup', { method: 'POST' });
      const data = await res.json();
      if (data.setupUrl) {
        window.location.href = data.setupUrl;
      }
    } catch (err) {
      console.error(err);
      setAdding(false);
    }
  };

  const removeMethod = async (methodId: string) => {
    if (!confirm('Remove this payment method?')) return;

    await fetch(`/api/billing/payment-methods/${methodId}`, { method: 'DELETE' });
    setMethods(methods.filter(m => m.id !== methodId));
  };

  const setDefault = async (methodId: string) => {
    await fetch(`/api/billing/payment-methods/${methodId}/set-default`, { method: 'POST' });
    setMethods(methods.map(m => ({ ...m, isDefault: m.id === methodId })));
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Payment Methods</h1>
          <button
            onClick={addPaymentMethod}
            disabled={adding}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {adding ? 'Redirecting...' : 'Add Payment Method'}
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">💳</span>
            <p className="mt-4 text-gray-500 mb-6">No payment methods added yet</p>
            <button
              onClick={addPaymentMethod}
              disabled={adding}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Add Your First Payment Method
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map(method => (
              <div key={method.id} className={`bg-white border rounded-xl p-6 ${method.isDefault ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          {method.brand} •••• {method.last4}
                        </h3>
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires {method.expMonth}/{method.expYear}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => setDefault(method.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => removeMethod(method.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Remove
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
