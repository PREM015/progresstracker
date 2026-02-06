'use client';
import { useState, useEffect } from 'react';

export function SubscriptionsList() {
    const [subs, setSubs] = useState<any[]>([]);
    useEffect(() => {
        fetch('/api/admin/billing/subscriptions').then(r => r.json()).then(d => setSubs(d || []));
    }, []);

    return (
        <div className="space-y-4">
            {subs.map(sub => (
                <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-white font-semibold">{sub.user.email}</div>
                            <div className="text-zinc-500 text-sm">{sub.tier} - ${sub.amount}/mo</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${sub.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'}`}>{sub.status}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
export default SubscriptionsList;
