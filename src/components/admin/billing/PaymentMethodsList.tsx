'use client';

import { useState, useEffect } from 'react';

export function PaymentMethodsList() {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/billing/payment-methods')
            .then(res => res.json())
            .then(data => setMethods(data || []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading payment methods...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
            <div className="space-y-3">
                {methods.map((method) => (
                    <div key={method.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                        <div>
                            <div className="text-white font-medium">{method.type}</div>
                            <div className="text-zinc-500 text-sm">**** {method.last4}</div>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${method.isDefault ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                            {method.isDefault ? 'Default' : 'Active'}
                        </span>
                    </div>
                ))}
                {methods.length === 0 && (
                    <div className="text-zinc-500 text-center py-4">No payment methods found</div>
                )}
            </div>
        </div>
    );
}

export default PaymentMethodsList;
