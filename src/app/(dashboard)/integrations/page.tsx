"use client";

import { useState, useEffect } from "react";
import IntegrationCard from "@/components/settings/IntegrationCard";

export default function IntegrationsPage() {
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
      const response = await fetch(`/api/integrations/${integrationId}/connect`, {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh list
        const data = await fetch('/api/integrations').then(r => r.json());
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to connect integration:', error);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh list
        const data = await fetch('/api/integrations').then(r => r.json());
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
    }
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Integrations</h1>
          <p className="text-gray-600 mt-2">Connect third-party tools to enhance your workflow</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {integrations.map(integration => (
            <div key={integration.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{integration.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{integration.description}</p>

                  {integration.connected ? (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                        <span>✓</span>
                        <span>Connected</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {integrations.length === 0 && (
            <div className="col-span-2 text-center py-16">
              <span className="text-5xl">🔌</span>
              <p className="mt-4 text-gray-500">No integrations available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
