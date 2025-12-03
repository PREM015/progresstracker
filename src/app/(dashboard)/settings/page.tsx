// src/app/(dashboard)/settings/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

export const metadata: Metadata = {
  title: 'Settings | CodeSync Pro',
  description: 'Manage your account settings and preferences',
};

export default function SettingsPage() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <SettingsTabs />
    </div>
  );
}