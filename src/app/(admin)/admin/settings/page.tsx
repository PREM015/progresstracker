"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Bell,
  Shield,
  Database,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings as SettingsIcon,
  Zap,
} from "lucide-react";

interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    supportEmail: string;
    maintenanceMode: boolean;
    debugMode: boolean;
  };
  sync: {
    defaultSyncInterval: number;
    maxRetries: number;
    maxConcurrentSyncs: number;
    syncTimeout: number;
    enableAutoSync: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireEmailVerification: boolean;
    require2FA: boolean;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
    adminAlertEmail: string;
    syncFailureAlerts: boolean;
    userSignupAlerts: boolean;
  };
  data: {
    dataRetentionDays: number;
    maxExportRecords: number;
    enableAnalytics: boolean;
    anonymizeData: boolean;
  };
  limits: {
    maxPlatformsPerUser: number;
    maxGoalsPerUser: number;
    rateLimitPerMinute: number;
    maxFileUploadSize: number;
  };
}

const defaultSettings: SystemSettings = {
  general: {
    siteName: "Progress Tracker",
    siteUrl: "",
    adminEmail: "",
    supportEmail: "",
    maintenanceMode: false,
    debugMode: false,
  },
  sync: {
    defaultSyncInterval: 1440,
    maxRetries: 3,
    maxConcurrentSyncs: 5,
    syncTimeout: 30000,
    enableAutoSync: true,
  },
  security: {
    sessionTimeout: 7,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireEmailVerification: true,
    require2FA: false,
  },
  notifications: {
    enableEmailNotifications: true,
    enablePushNotifications: false,
    adminAlertEmail: "",
    syncFailureAlerts: true,
    userSignupAlerts: true,
  },
  data: {
    dataRetentionDays: 365,
    maxExportRecords: 10000,
    enableAnalytics: true,
    anonymizeData: false,
  },
  limits: {
    maxPlatformsPerUser: 10,
    maxGoalsPerUser: 20,
    rateLimitPerMinute: 60,
    maxFileUploadSize: 5,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings({ ...defaultSettings, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <T extends keyof SystemSettings>(
    section: T,
    key: keyof SystemSettings[T],
    value: SystemSettings[T][keyof SystemSettings[T]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "sync", label: "Sync", icon: RefreshCw },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "data", label: "Data", icon: Database },
    { id: "limits", label: "Limits", icon: Zap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your application settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700 dark:text-green-200">Settings saved successfully!</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
        {activeTab === "general" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name</label>
              <input
                type="text"
                value={settings.general.siteName}
                onChange={(e) => updateSetting("general", "siteName", e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site URL</label>
              <input
                type="text"
                value={settings.general.siteUrl}
                onChange={(e) => updateSetting("general", "siteUrl", e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => updateSetting("general", "maintenanceMode", e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                Maintenance Mode
              </label>
              <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.general.debugMode}
                  onChange={(e) => updateSetting("general", "debugMode", e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                Debug Mode
              </label>
            </div>
          </div>
        )}

        {/* TODO: Add other tabs content (sync, security, notifications, data, limits) similarly */}
      </div>
    </div>
  );
}
