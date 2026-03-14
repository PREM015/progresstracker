'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, Settings2 } from 'lucide-react';

interface AccountSettingsProps {
  className?: string;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'hi', label: 'हिन्दी' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export const AccountSettings: React.FC<AccountSettingsProps> = ({ className = '' }) => {
  const { settings, updateSettings, isLoading } = useSettings();
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language || 'en');
      setTimezone(settings.timezone || 'UTC');
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ language, timezone });
      toast.success('Account settings saved');
    } catch (error) {
      toast.error('Failed to save account settings');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const selectClasses =
    'w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm';
  const labelClasses =
    'block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1';

  return (
    <GlassCard className={`p-8 flex flex-col gap-8 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Account Settings
          </h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Preferences</p>
      </div>

      <div className="space-y-6">
        {/* Language */}
        <div className="space-y-1">
          <label className={labelClasses}>Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={selectClasses}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div className="space-y-1">
          <label className={labelClasses}>Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={selectClasses}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-4 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </GlassCard>
  );
};

export default AccountSettings;
