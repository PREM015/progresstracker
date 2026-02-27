'use client';

import { PlatformList } from '@/components/platforms/PlatformList';
import { PlatformFilters } from '@/components/platforms/PlatformFilters';
import { SyncHistory } from '@/components/platforms/SyncHistory';
import { MetaTags } from '@/components/seo/MetaTags';
import { usePlatforms } from '@/hooks/usePlatforms';
import { PlatformConfig } from '@/components/platforms/PlatformCard';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConnectedPlatformsPage() {
  const {
    platforms,
    connectedPlatforms,
    isLoading,
    connect,
    disconnect,
    sync,
    logs,
    isLoadingLogs
  } = usePlatforms();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // Categories for the filter (hardcoded or derived from platforms)
  const categories = useMemo(() => {
    return [
      { id: 'dsa', name: 'DSA' },
      { id: 'job', name: 'Jobs' },
      { id: 'git', name: 'Git' },
      { id: 'learning', name: 'Learning' },
      { id: 'hackathon', name: 'Hackathons' },
      { id: 'opensource', name: 'Open Source' },
      { id: 'company', name: 'Companies' },
      { id: 'design', name: 'Design' },
      { id: 'data_science', name: 'Data Science' },
    ];
  }, []);

  const platformConfigs = useMemo<PlatformConfig[]>(() => {
    if (!platforms) return [];

    const filtered = platforms.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.displayName || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });

    return filtered.map(platform => {
      const connection = connectedPlatforms?.find(c => c.platform.slug === platform.slug);

      return {
        id: platform.id,
        name: platform.displayName || platform.name,
        description: platform.description || `Connect your ${platform.name} account`,
        isConnected: !!connection,
        lastSynced: connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : undefined,
        status: connection ? (connection.connectionStatus === 'connected' ? 'connected' : 'error') : 'disconnected',
        icon: null,
        metrics: connection ? {
          solved: (connection as any).stats?.solvedCount || (connection as any).stats?.problemsSolved,
          rating: (connection as any).stats?.rating,
          streak: (connection as any).stats?.streak,
        } : undefined
      };
    });
  }, [platforms, connectedPlatforms, search, category]);

  const handleConnectSubmit = async (id: string, data: Record<string, any>) => {
    try {
      await connect({ platformId: id, data });
      toast.success("Connection Initiated", {
        description: "Verifying your credentials..."
      });
    } catch (error) {
      toast.error("Connection Failed", {
        description: "Please check your credentials and try again."
      });
    }
  };

  const handleDisconnect = (id: string) => {
    disconnect(id);
    toast.success("Disconnected", {
      description: "Platform disconnected successfully."
    });
  };

  const handleSync = (id: string) => {
    sync(id);
    toast.info("Sync Started", {
      description: "Fetching latest data..."
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetaTags title="Connected Platforms" description="Manage your external accounts" />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connected Platforms</h2>
        <p className="text-muted-foreground">
          Manage your connections to external coding platforms to verify your progress.
        </p>
      </div>

      <PlatformFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        totalResults={platformConfigs.length}
      />

      <PlatformList
        platforms={platformConfigs}
        onConnectSubmit={handleConnectSubmit}
        onDisconnect={handleDisconnect}
        onSync={handleSync}
      />

      <div className="pt-8 border-t">
        <SyncHistory logs={logs} isLoading={isLoadingLogs} />
      </div>
    </div>
  );
}
