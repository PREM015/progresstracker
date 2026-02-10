"use client";

import { useState } from "react";
import SettingsNavigation from "@/components/settings/SettingsNavigation";
import ProfileSettings from "@/components/settings/ProfileSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <div className="grid lg:grid-cols-4 gap-6">
        <div>
          <SettingsNavigation
            currentSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>

        <div className="lg:col-span-3">
          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "account" && <AccountSettings />}
          {activeSection === "security" && <SecuritySettings />}
          {activeSection === "notifications" && <NotificationSettings />}
          {activeSection === "privacy" && <PrivacySettings />}
          {activeSection === "appearance" && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}
