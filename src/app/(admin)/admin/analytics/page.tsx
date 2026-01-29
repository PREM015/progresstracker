// src/app/(admin)/admin/analytics/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ================= TYPES ================= */

interface AnalyticsData {
  totalUsers: number;
  userChange: number;
  activeToday: number;
  activeChange: number;
  totalSyncs: number;
  syncChange: number;
  successRate: number;
  rateChange: number;
  activeUsers: number;
  inactiveUsers: number;
  platformData: { label: string; value: number }[];
  categoryData: { label: string; value: number }[];
  monthlyGrowth: { month: string; users: number }[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "orange";
  isPercent?: boolean;
  loading?: boolean;
}

/* ================= COMPONENTS ================= */

function StatsCard({ title, value, change, icon: Icon, color, isPercent, loading }: StatCardProps) {
  const bgClasses: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  };

  const changeColor = change >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${bgClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {!loading && (
          <div className={`flex items-center gap-1 ${changeColor}`}>
            {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mt-4" />
      ) : (
        <>
          <p className="mt-4 text-3xl font-bold text-gray-800 dark:text-white">
            {typeof value === "number" && !isPercent ? value.toLocaleString() : value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
        </>
      )}
    </div>
  );
}

function BarChart({ data, loading }: { data: { label: string; value: number }[]; loading?: boolean }) {
  if (loading)
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );

  if (data.length === 0)
    return (
      <div className="flex justify-center items-center h-48 text-gray-500">No data available</div>
    );

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
            <span className="font-medium text-gray-800 dark:text-white">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ data, loading }: { data: { month: string; users: number }[]; loading?: boolean }) {
  if (loading)
    return (
      <div className="h-64 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );

  if (data.length === 0)
    return (
      <div className="h-64 flex justify-center items-center text-gray-500">No data available</div>
    );

  const maxValue = Math.max(...data.map((d) => d.users), 1);

  return (
    <div className="h-64 flex items-end gap-2 px-4">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full bg-linear-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
            style={{ height: `${(item.users / maxValue) * 100}%`, minHeight: "4px" }}
          />
          <span className="text-xs text-gray-400">{item.month}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= MAIN ================= */

export default function AnalyticsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateRange, setDateRange] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/analytics?range=${dateRange}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const analyticsData: AnalyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/admin/analytics/export?range=${dateRange}`);
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (error)
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const activePercentage = data
    ? Math.round((data.activeUsers / Math.max(data.activeUsers + data.inactiveUsers, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ... same JSX you had, but using StatsCard component instead of inline repeated JSX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data && (
          <>
            <StatsCard
              title="Total Users"
              value={data.totalUsers}
              change={data.userChange}
              icon={Users}
              color="blue"
              loading={loading}
            />
            <StatsCard
              title="Active Today"
              value={data.activeToday}
              change={data.activeChange}
              icon={Activity}
              color="green"
              loading={loading}
            />
            <StatsCard
              title="Total Syncs"
              value={data.totalSyncs}
              change={data.syncChange}
              icon={RefreshCw}
              color="purple"
              loading={loading}
            />
            <StatsCard
              title="Success Rate"
              value={`${data.successRate}%`}
              change={data.rateChange}
              icon={Target}
              color="orange"
              isPercent
              loading={loading}
            />
          </>
        )}
      </div>

      {/* Monthly & Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">User Growth</h2>
          </div>
          <div className="p-6">
            <MonthlyChart data={data?.monthlyGrowth || []} loading={loading} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">User Distribution</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative mb-6 w-32 h-32">
                  <svg className="w-full h-full">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="16"
                      className="dark:stroke-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="16"
                      strokeDasharray={`${(activePercentage / 100) * 352} 352`}
                      strokeLinecap="round"
                      transform="rotate(-90 64 64)"
                    />
                    <defs>
                      <linearGradient id="gradient">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{activePercentage}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                  </div>
                </div>
                <BarChart data={data?.platformData || []} loading={loading} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
