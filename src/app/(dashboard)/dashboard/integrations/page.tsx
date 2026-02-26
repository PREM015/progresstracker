/**
 * ============================================================================
 * INTEGRATIONS DASHBOARD PAGE
 * ============================================================================
 * This page lists all available third-party integrations (platforms) and
 * allows users to connect or disconnect them. It combines data from two APIs:
 * 1. Available Platforms
 * 2. Currently Connected Platforms for the user
 */
'use client';

import { useState, useEffect } from "react";
import { Loader2, Plus, Unplug, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Shape of a Platform as retrieved from the API
 */
interface Platform {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  category: string;
}

/**
 * Shape of a User Connection as retrieved from the API
 */
interface Connection {
  id: string;
  platformId: string;
  isActive: boolean;
  syncStatus: string;
}

/**
 * Combined view model for the UI representing a platform 
 * and its current user connection state
 */
interface IntegrationViewModel extends Platform {
  isConnected: boolean;
  connectionId?: string;
  syncStatus?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all global platforms and the user's specific connections,
   * then merges them together into a unified ViewModel array.
   */
  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all available platforms
      const platformsRes = await fetch('/api/platforms');
      if (!platformsRes.ok) throw new Error('Failed to fetch platforms catalog');
      const platformsData = await platformsRes.json();
      const allPlatforms: Platform[] = platformsData.data || platformsData || [];

      // 2. Fetch the current user's active connections
      const connectedRes = await fetch('/api/platforms/connected');
      if (!connectedRes.ok) throw new Error('Failed to fetch user connections');
      const connectedData = await connectedRes.json();
      const userConnections: Connection[] = connectedData.data?.connections || connectedData.connections || [];

      // 3. Map into a unified ViewModel for the UI to consume easily
      const merged: IntegrationViewModel[] = allPlatforms.map(platform => {
        const connection = userConnections.find(c => c.platformId === platform.id);
        return {
          ...platform,
          isConnected: !!connection && connection.isActive,
          connectionId: connection?.id,
          syncStatus: connection?.syncStatus
        };
      });

      setIntegrations(merged);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred loading integrations.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchIntegrations();
  }, []);

  /**
   * Action trigger to connect to an external platform.
   * Depending on the authentication strategy (OAuth vs API Key), this usually 
   * redirects the user to the provider's authorization page.
   * @param slug - The URL-friendly identifier for the platform
   */
  const handleConnect = (slug: string) => {
    // Redirecting browser to the backend OAuth initialization / authorization route
    window.location.href = `/api/platforms/${slug}/connect`;
  };

  /**
   * Action trigger to revoke an existing connection to a platform.
   * Disables syncs and cleans up user relation.
   * @param connectionId - The unique ID of the 'UserPlatform' connection record
   */
  const handleDisconnect = async (connectionId: string) => {
    const isConfirmed = window.confirm("Are you sure you want to disconnect this integration? Syncing will stop immediately.");
    if (!isConfirmed) return;

    try {
      // Calls the disconnect standard route 
      const response = await fetch(`/api/platforms/disconnect/${connectionId}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh the list immediately to show the disconnected state
        await fetchIntegrations();
      } else {
        throw new Error('Disconnection request failed');
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      alert('Could not disconnect. Please try again later.');
    }
  };

  // Phase 1: Show a loading screen while resolving the parallel API fetches
  if (loading && integrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="font-medium animate-pulse">Loading available integrations...</p>
        </div>
      </div>
    );
  }

  // Phase 2: Show the integrations grid
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Integrations</h1>
          <p className="text-gray-600 mt-2 text-lg">Connect your third-party tools to automatically sync your progress and track achievements in one place.</p>
        </div>

        {/* Global Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map(integration => (
            <div
              key={integration.id}
              className={`bg-white rounded-2xl p-6 transition-all duration-200 shadow-sm border ${integration.isConnected ? 'border-indigo-200 shadow-indigo-100/50' : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
            >
              <div className="flex flex-col h-full">
                {/* Platform Identity */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-2xl overflow-hidden p-2">
                    {/* Render Icon if available, else a fallback initial */}
                    {integration.icon ? (
                      // If the icon is an image link or emoji, we handle it natively.
                      integration.icon.startsWith('http') || integration.icon.startsWith('/')
                        ? <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                        : <span>{integration.icon}</span>
                    ) : (
                      <span className="text-gray-500 font-bold font-sans text-xl">{integration.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{integration.name}</h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize mt-1 border border-gray-200">
                      {integration.category.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-sm text-gray-600 mb-6 flex-grow line-clamp-3">
                  {integration.description || `Connect ${integration.name} to sync your tracking data.`}
                </p>

                {/* Connection Status & Actions */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                  {integration.isConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected</span>
                      </div>
                      <button
                        onClick={() => integration.connectionId && handleDisconnect(integration.connectionId)}
                        className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-50"
                        title="Disconnect Integration"
                      >
                        <Unplug className="w-4 h-4" />
                        <span className="hidden sm:inline">Revoke</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.slug)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors focus:ring-4 focus:ring-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                      Connect {integration.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Empty State if no integrations available in the system */}
          {!loading && integrations.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
              <Unplug className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
              <p>The system hasn't loaded any platform integrations yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
