"use client";

import { useState, useEffect } from "react";

export function IntegrationsSettings() {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/integrations')
            .then(r => r.json())
            .then(data => setIntegrations(data.integrations || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleConnect = async (integrationId: string) => {
        try {
            await fetch(`/api/integrations/${integrationId}/connect`, { method: 'POST' });
            alert('Integration connected!');
        } catch (err) {
            alert('Failed to connect integration');
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-200 h-64 rounded-xl" />;
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Connected Integrations</h2>

            <div className="space-y-4">
                {integrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No integrations configured</p>
                    </div>
                ) : (
                    integrations.map((integration: any) => (
                        <div key={integration.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                                <h3 className="font-medium text-gray-900">{integration.name}</h3>
                                <p className="text-sm text-gray-600">{integration.description}</p>
                            </div>
                            <button
                                onClick={() => handleConnect(integration.id)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                {integration.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
