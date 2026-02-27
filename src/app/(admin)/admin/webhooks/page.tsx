"use client";

import { useState, useEffect } from "react";

export default function AdminWebhooksPage() {
    const [webhooks, setWebhooks] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/admin/webhooks')
            .then(r => r.json())
            .then(data => setWebhooks(data.webhooks || []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">🪝 Webhooks Management</h1>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-200">
                        {webhooks.map((webhook: any) => (
                            <div key={webhook.id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{webhook.url}</h3>
                                        <p className="text-sm text-gray-600 mt-1">Events: {webhook.events?.join(', ')}</p>
                                        <p className="text-xs text-gray-400 mt-2">Created: {new Date(webhook.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <button className="text-red-600 hover:text-red-700">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
