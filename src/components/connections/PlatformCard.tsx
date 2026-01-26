"use client";

import { useState } from "react";
import { RotateCw, Trash2, Loader, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import ConnectModal from "./ConnectModal";

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
  slug?: string;
}

interface PlatformCardProps {
  platform: Platform;
  isConnected?: boolean;
  lastSynced?: Date;
  onConnect?: (platformId: string, username?: string, token?: string) => Promise<void>;
  onDisconnect?: (platformId: string) => Promise<void>;
  onSync?: (platformId: string) => Promise<void>;
}

export default function PlatformCard({
  platform,
  isConnected: initialConnected = false,
  lastSynced,
  onConnect,
  onDisconnect,
  onSync,
}: PlatformCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isLoading, setIsLoading] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; gradient: string }> = {
      DSA: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        gradient: "from-blue-400 to-blue-600",
      },
      GIT: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-400",
        gradient: "from-purple-400 to-purple-600",
      },
      JOB: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        gradient: "from-green-400 to-green-600",
      },
      LEARNING: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-700 dark:text-orange-400",
        gradient: "from-orange-400 to-orange-600",
      },
      HACKATHON: {
        bg: "bg-pink-100 dark:bg-pink-900/30",
        text: "text-pink-700 dark:text-pink-400",
        gradient: "from-pink-400 to-pink-600",
      },
      OPENSOURCE: {
        bg: "bg-cyan-100 dark:bg-cyan-900/30",
        text: "text-cyan-700 dark:text-cyan-400",
        gradient: "from-cyan-400 to-cyan-600",
      },
      COMPANY: {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-700 dark:text-indigo-400",
        gradient: "from-indigo-400 to-indigo-600",
      },
    };
    return colors[category] || {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-400",
      gradient: "from-gray-400 to-gray-600",
    };
  };

  const categoryColor = getCategoryColor(platform.category);

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleSync = async () => {
    if (!onSync) return;
    setIsLoading(true);
    try {
      await onSync(platform.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    if (window.confirm(`Disconnect ${platform.name}?`)) {
      setIsLoading(true);
      try {
        await onDisconnect(platform.id);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getTimeAgo = (date: Date | undefined) => {
    if (!date) return "Never";
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 group">
        {/* Gradient Header */}
        <div
          className={`h-20 bg-gradient-to-br ${categoryColor.gradient} opacity-90 relative overflow-hidden`}
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute w-40 h-40 bg-white rounded-full -top-20 -right-20"></div>
            <div className="absolute w-32 h-32 bg-white rounded-full -bottom-16 -left-16"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Platform Icon & Name */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-4xl bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                {platform.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {platform.name}
                </h3>
                <span
                  className={`inline-block mt-1 text-xs font-semibold px-2 py-1 rounded-full ${categoryColor.bg} ${categoryColor.text}`}
                >
                  {platform.category}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Status & Last Sync */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isConnected
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {isConnected ? "✓ Connected" : "Not Connected"}
              </span>
            </div>
            {isConnected && lastSynced && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Synced {getTimeAgo(lastSynced)}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSync}
                  disabled={isLoading}
                  variant="secondary"
                  className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCw className="w-4 h-4" />
                  )}
                  Sync
                </Button>
                <Button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  variant="ghost"
                  className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showModal && (
        <ConnectModal
          platform={platform}
          onClose={() => setShowModal(false)}
          onConnect={() => {
            setIsConnected(true);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}