"use client";

import { SecuritySettings } from "@/components/settings";

export default function SettingsSecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Security Settings</h1>
        <SecuritySettings />
      </div>
    </div>
  );
}
