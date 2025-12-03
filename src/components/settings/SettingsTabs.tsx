// src/components/settings/SettingsTabs.tsx

'use client';

import React, { useState } from 'react';
import { User, Bell, Palette, RefreshCw, Shield } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { ProfileSettings } from './ProfileSettings';
import { NotificationSettings } from './NotificationSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { SyncSettings } from './SyncSettings';
import { AccountSettings } from './AccountSettings';

const tabs = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    component: ProfileSettings,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    component: NotificationSettings,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    component: AppearanceSettings,
  },
  {
    id: 'sync',
    label: 'Sync',
    icon: RefreshCw,
    component: SyncSettings,
  },
  {
    id: 'account',
    label: 'Account',
    icon: Shield,
    component: AccountSettings,
  },
];

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('profile');

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || ProfileSettings;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Tabs>

      <div className="py-6">
        <ActiveComponent />
      </div>
    </div>
  );
}