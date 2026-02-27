'use client';

import React, { useState, useEffect } from 'react';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiryDate: string;
  isDefault: boolean;
}

interface PaymentMethodsListProps {
  className?: string;
}

export const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({
  className = '',
}) => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetch('/api/billing/payment-methods')
      .then(r => r.json())
      .then(data => setMethods(data));
  }, []);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Payment Methods</h3>

      <div className="space-y-3">
        {methods.map((method) => (
          <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-3xl">💳</div>
              <div>
                <div className="font-semibold text-gray-900">
                  {method.type} •••• {method.last4}
                </div>
                <div className="text-sm text-gray-600">Expires {method.expiryDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {method.isDefault && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Default
                </span>
              )}
              <button className="text-red-600 hover:text-red-700">Remove</button>
            </div>
          </div>
        ))}

        {methods.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">💳</span>
            No payment methods added
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsList;
