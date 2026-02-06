"use client";

import { useState, useEffect } from "react";

export function WebhooksSettings() {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [url, setUrl] = useState("");

    useEffect(() => {
        fetch('/api/user/webhooks')
            .then(r => r.json())
            .then(data => setWebhooks(data.webhooks || []))
            .catch(err => console.error(err));
    }, []);

    const handleCreate = async () => {
        try {
            await fetch('/api/user/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, events: ['*'] })
            });
            setShowForm(false);
            setUrl("");
            // Refresh list
            window.location.reload();
        } catch (err) {
            alert('Failed to create webhook');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this webhook?')) return;
        try {
            await fetch(`/api/user/webhooks/${id}`, { method: 'DELETE' });
            setWebhooks(webhooks.filter(w => w.id !== id));
        } catch (err) {
            alert('Failed to delete webhook');
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Webhooks</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Add Webhook
                </button>
            </div>

            {showForm && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/webhook"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-3"
                    />
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Create
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {webhooks.map((webhook: any) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">{webhook.url}</p>
                            <p className="text-sm text-gray-600">Events: {webhook.events?.join(', ')}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(webhook.id)}
                            className="text-red-600 hover:text-red-700"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
