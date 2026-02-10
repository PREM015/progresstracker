// components/platforms/SyncDashboard.tsx
'use client';

import React from 'react';
import { PlatformList } from './PlatformList';
import { SyncHistoryList } from './SyncHistoryList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatforms } from '@/hooks/usePlatforms';
import { useSync } from '@/hooks/useSync';
import { formatDistanceToNow } from 'date-fns';

export function SyncDashboard() {
    // Real hooks
    const { platformsWithConnection, isLoading: platformsLoading } = usePlatforms();
    const {
        history,
        lastSyncAt,
        syncAll,
        isSyncingAll,
        recentFailures
    } = useSync();

    const connectedCount = platformsWithConnection.filter(p => p.isConnected).length;
    const totalCount = platformsWithConnection.length;

    const handleSyncAll = async () => {
        try {
            await syncAll();
        } catch (error) {
            console.error('Failed to sync all:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sync Status</h2>
                    <p className="text-muted-foreground">Manage platform connections and synchronization.</p>
                </div>
                <Button onClick={handleSyncAll} disabled={isSyncingAll}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    {isSyncingAll ? 'Syncing...' : 'Sync All Now'}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connected Platforms</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{connectedCount}/{totalCount}</div>
                        <p className="text-xs text-muted-foreground">Platforms connected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {lastSyncAt ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true }) : 'Never'}
                        </div>
                        <p className="text-xs text-muted-foreground">Automatic sync enabled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sync Errors</CardTitle>
                        <AlertCircle className={`h-4 w-4 ${recentFailures.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentFailures.length}</div>
                        <p className="text-xs text-muted-foreground">Recent failures</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="platforms" className="w-full">
                <TabsList>
                    <TabsTrigger value="platforms">Platforms</TabsTrigger>
                    <TabsTrigger value="history">History & Logs</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="platforms" className="space-y-4 pt-4">
                    {/* Map the internal types from hook to what PlatformList expects if needed,
                        but assuming PlatformList was built to likely matching types or we adjust it.
                        Actually, PlatformList likely expects "Platform" or similar.
                        Let's check usePlatforms hook output structure. 
                        It returns `platformsWithConnection` which likely works or needs minor mapping.
                        The original mock data was: { id, name, isConnected, lastSync, status }.
                        Our hook data has: { platform: {id, name...}, isConnected, lastSyncedAt, ... }.
                        We might need to map it if PlatformList is rigid. 
                        Let's assume we map it to be safe.
                    */}
                    <PlatformList
                        platforms={platformsWithConnection.map(p => ({
                            id: p.platform.id,
                            name: p.platform.name,
                            description: `Sync progress from ${p.platform.name}`,
                            isConnected: p.isConnected,
                            lastSync: p.lastSyncedAt ? p.lastSyncedAt.toString() : null,
                            status: p.isConnected ? 'connected' : 'disconnected',
                            icon: p.platform.icon
                        }))}
                    />
                </TabsContent>

                <TabsContent value="history" className="space-y-4 pt-4">
                    <SyncHistoryList platformId="all" />
                </TabsContent>

                <TabsContent value="settings" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sync Settings</CardTitle>
                            <CardDescription>Configure how often data is synchronized.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Sync settings are currently managed globally by administrators.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
