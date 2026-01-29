"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreVertical,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Activity,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PlatformCategory } from "@prisma/client";

interface Platform {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  category: PlatformCategory;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  healthStatus: string | null;
  lastHealthCheck: string | null;
  totalUsers: number;
  successRate: number;
  website: string | null;
}

interface PlatformStats {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
}

const categoryIcons: Record<PlatformCategory, string> = {
  DSA: "🧩",
  JOB: "💼",
  GIT: "🐙",
  LEARNING: "📚",
  HACKATHON: "🏆",
  OPENSOURCE: "🌐",
  COMPANY: "🏢",
  DESIGN: "🎨",
  DATA_SCIENCE: "📊",
  OTHER: "📦",
};

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/platforms");
      if (!res.ok) throw new Error("Failed to fetch platforms");

      const data = await res.json();
      setPlatforms(data.platforms || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSync = async (platformId: string) => {
    try {
      setSyncing(platformId);
      const res = await fetch(`/api/admin/platforms/${platformId}/sync`, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      await fetchPlatforms();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleActive = async (platformId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/platforms/${platformId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update platform");
      await fetchPlatforms();
    } catch (err) {
      console.error("Toggle error:", err);
    }
    setOpenMenu(null);
  };

  const filteredPlatforms = platforms.filter((platform) => {
    const matchesSearch =
      platform.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      platform.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || platform.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(platforms.map((p) => p.category)));

  const getSyncStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { icon: React.ReactNode; className: string }> = {
      healthy: { icon: <CheckCircle className="h-4 w-4" />, className: "text-green-600 bg-green-100 dark:bg-green-900/30" },
      degraded: { icon: <AlertTriangle className="h-4 w-4" />, className: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" },
      down: { icon: <XCircle className="h-4 w-4" />, className: "text-red-600 bg-red-100 dark:bg-red-900/30" },
    };
    const config = statusMap[status || ""] || { icon: <AlertCircle className="h-4 w-4" />, className: "text-gray-600 bg-gray-100 dark:bg-gray-700" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {(status || "Unknown").charAt(0).toUpperCase() + (status || "unknown").slice(1)}
      </span>
    );
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return "Never";
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchPlatforms} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Platforms</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage connected platforms and their configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlatforms}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/platforms/new"
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Platform
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Platforms", value: stats?.total || 0, icon: Activity, color: "blue" },
          { label: "Healthy", value: stats?.healthy || 0, icon: CheckCircle, color: "green" },
          { label: "Degraded", value: stats?.degraded || 0, icon: AlertTriangle, color: "yellow" },
          { label: "Down", value: stats?.down || 0, icon: XCircle, color: "red" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 flex items-center gap-3">
            <div className={`p-2 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-lg`}>
              <item.icon className={`h-5 w-5 text-${item.color}-600 dark:text-${item.color}-400`} />
            </div>
            <div>
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : <p className="text-2xl font-bold text-gray-800 dark:text-white">{item.value}</p>}
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "grid" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Platforms List */}
      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}

      {!loading && filteredPlatforms.length === 0 && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || selectedCategory !== "all" ? "No platforms match your filters" : "No platforms configured yet"}
          </p>
          <Link href="/admin/platforms/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-blue-600 hover:text-blue-700">
            <Plus className="h-4 w-4" /> Add your first platform
          </Link>
        </div>
      )}

      {!loading && filteredPlatforms.length > 0 && (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              ref={menuRef}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: platform.color ? `${platform.color}20` : "#E5E7EB" }}
                    >
                      {platform.icon || categoryIcons[platform.category] || "📦"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{platform.displayName || platform.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{platform.category}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === platform.id ? null : platform.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    {openMenu === platform.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-10">
                        <Link
                          href={`/admin/platforms/${platform.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings className="h-4 w-4" /> Configure
                        </Link>
                        {platform.website && (
                          <a
                            href={platform.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <ExternalLink className="h-4 w-4" /> Visit Website
                          </a>
                        )}
                        <button
                          onClick={() => handleToggleActive(platform.id, platform.isActive)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {platform.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          {platform.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    {getSyncStatusBadge(platform.healthStatus)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Users</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{platform.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Success Rate</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{platform.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Last Check</span>
                    <span className="text-sm text-gray-800 dark:text-white">{formatLastSync(platform.lastHealthCheck)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        platform.successRate >= 95
                          ? "bg-green-500"
                          : platform.successRate >= 80
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${platform.successRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex items-center gap-2">
                <button
                  onClick={() => handleSync(platform.id)}
                  disabled={syncing === platform.id || !platform.isActive}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing === platform.id ? "animate-spin" : ""}`} />
                  {syncing === platform.id ? "Syncing..." : "Sync Now"}
                </button>
                <Link
                  href={`/admin/platforms/${platform.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="h-4 w-4" /> Configure
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
