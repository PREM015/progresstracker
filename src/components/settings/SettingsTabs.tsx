"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import ProfileSettings from "./ProfileSettings";
import AppearanceSettings from "./AppearanceSettings";
import SyncSettings from "./SyncSettings";
import NotificationSettings from "./NotificationSettings";
import AccountSettings from "./AccountSettings";

const tabs = [
  { id: "profile", label: "Profile", component: ProfileSettings },
  { id: "appearance", label: "Appearance", component: AppearanceSettings },
  { id: "sync", label: "Sync", component: SyncSettings },
  { id: "notifications", label: "Notifications", component: NotificationSettings },
  { id: "account", label: "Account", component: AccountSettings },
];

export default function SettingsTabs() {
  const [activeTab, setActiveTab] = useState("profile");

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || ProfileSettings;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2 px-6 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}