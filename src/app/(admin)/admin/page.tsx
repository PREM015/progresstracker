/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

/* ================= TYPES ================= */

type ChangeType = "up" | "down";
type PlatformHealth = "healthy" | "degraded" | "down" | "unknown";
type CardColor = "blue" | "green" | "purple" | "orange";

interface DashboardStats {
  totalUsers: number;
  userChange: number;
  activePlatforms: number;
  platformChange: number;
  dailySyncs: number;
  syncChange: number;
  successRate: number;
  rateChange: number;
}

interface RecentActivity {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  action: string;
  status: "success" | "pending" | "failed";
  createdAt: string;
}

interface PlatformStatus {
  id: string;
  name: string;
  slug: string;
  healthStatus: PlatformHealth;
  lastHealthCheck: string | null;
  totalUsers: number;
  successRate: number;
}

/* ================= UTILS ================= */

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/* ================= COMPONENTS ================= */

function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  loading = false,
}: {
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  icon: React.ElementType;
  color: CardColor;
  loading?: boolean;
}) {
  const colorClasses: Record<CardColor, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mt-1" />
          ) : (
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {!loading && (
        <div className="flex items-center gap-1 mt-4">
          {changeType === "up" ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${changeType === "up" ? "text-green-500" : "text-red-500"}`}>
            {change}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

function ActivityItem({
  userName,
  action,
  time,
  status,
}: {
  userName: string;
  action: string;
  time: string;
  status: "success" | "pending" | "failed";
}) {
  const statusIcons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    pending: <Clock className="h-5 w-5 text-yellow-500" />,
    failed: <XCircle className="h-5 w-5 text-red-500" />,
  };

  const initial = userName ? userName[0].toUpperCase() : "?";

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white">{userName}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{action}</p>
      </div>
      <div className="flex items-center gap-2">
        {statusIcons[status]}
        <span className="text-xs text-gray-400">{time}</span>
      </div>
    </div>
  );
}

function SyncStatusCard({
  platform,
  status,
  lastSync,
  users,
}: {
  platform: string;
  status: PlatformHealth;
  lastSync: string;
  users: number;
}) {
  const statusColors: Record<PlatformHealth, string> = {
    healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    degraded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    unknown: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
          <Layers className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </div>
        <div>
          <p className="font-medium text-gray-800 dark:text-white">{platform}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {users.toLocaleString()} users • Last sync: {lastSync}
          </p>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {status === "degraded" && <RefreshCw className="h-3 w-3 inline mr-1 animate-spin" />}
        {status}
      </span>
    </div>
  );
}

/* ================= MAIN ================= */

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const responses = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activities?limit=5"),
        fetch("/api/admin/platforms/status"),
      ]);

      if (!responses[0].ok || !responses[1].ok || !responses[2].ok) {
        throw new Error("Failed to fetch admin data");
      }

      const [statsData, activitiesData, platformsData] = await Promise.all(
        responses.map((r) => r.json())
      );

      setStats(statsData);
      setActivities(activitiesData.activities ?? []);
      setPlatforms(platformsData.platforms ?? []);
    } catch (err) {
      // typed error message
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96 text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchDashboardData}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Your UI JSX here, same as before */}
    </div>
  );
}
