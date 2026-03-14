"use client";

import { usePlatforms } from "@/hooks/usePlatforms";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Link2, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

export function IntegrationsSettings() {
  const {
    connectedPlatforms,
    platforms,
    isLoading,
    disconnect,
    isDisconnecting,
    sync,
    isSyncing,
  } = usePlatforms();

  const handleDisconnect = (platformId: string, name: string) => {
    disconnect(platformId, {
      onSuccess: () => toast.success(`${name} disconnected`),
      onError: () => toast.error(`Failed to disconnect ${name}`),
    });
  };

  const handleSync = (platformId: string, name: string) => {
    sync(platformId, {
      onSuccess: () => toast.success(`${name} sync started`),
      onError: () => toast.error(`Failed to sync ${name}`),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <GlassCard className="p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Connected Platforms
          </h3>
        </div>
        <a
          href="/platforms"
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          Add More
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {connectedPlatforms.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Link2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50">No platforms connected</h4>
            <p className="text-sm text-zinc-500 font-medium mt-1">
              Connect your coding platforms to start tracking your progress.
            </p>
          </div>
          <a
            href="/platforms"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Browse Platforms
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {connectedPlatforms.map((conn: any) => {
            const platform = platforms.find((p: any) => p.id === conn.platformId) || conn.platform || conn;
            const name = platform?.name || conn.name || conn.platformId || "Platform";
            const username = conn.username || conn.platformUsername;
            const isConnectedSyncing = isSyncing;
            const isConnectedDisconnecting = isDisconnecting;

            return (
              <div
                key={conn.id || conn.platformId}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center">
                    <span className="text-lg">{platform?.icon || "🔗"}</span>
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">{name}</div>
                    {username && (
                      <div className="text-xs text-zinc-500 font-medium">@{username}</div>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(conn.platformId || conn.id, name)}
                    disabled={isConnectedSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
                  >
                    {isConnectedSyncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Sync
                  </button>
                  <button
                    onClick={() => handleDisconnect(conn.platformId || conn.id, name)}
                    disabled={isConnectedDisconnecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {isConnectedDisconnecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-400 font-medium text-center">
        Manage all platform connections from the{" "}
        <a href="/platforms" className="text-indigo-500 hover:text-indigo-600 font-bold">
          Platforms page
        </a>
        .
      </p>
    </GlassCard>
  );
}
