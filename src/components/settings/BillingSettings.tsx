'use client';

import React, { useState } from 'react';

interface BillingSettingsProps {
  className?: string;
}

export const BillingSettings: React.FC<BillingSettingsProps> = ({
  className = '',
}) => {
  const [plan, setPlan] = useState('free');

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Billing Settings</h3>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Current Plan</h4>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-indigo-900 capitalize">{plan} Plan</div>
                <div className="text-sm text-indigo-700">Active subscription</div>
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Upgrade
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Billing Cycle</h4>
          <select className="w-full px-4 py-2 border rounded-lg">
            <option value="monthly">Monthly</option>
            <option value="annually">Annually (Save 20%)</option>
          </select>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Invoices</h4>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            View Invoice History
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings;
