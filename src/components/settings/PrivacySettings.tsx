'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, Shield } from 'lucide-react';

interface PrivacySettingsProps {
  className?: string;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ className = '' }) => {
  const { settings, updateSettings, isLoading, isUpdatingPrivacy } = useSettings();

  const [publicProfile, setPublicProfile] = useState(false);
  const [showInLeaderboard, setShowInLeaderboard] = useState(false);
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (settings) {
      setPublicProfile(settings.publicProfile ?? false);
      setShowInLeaderboard(settings.showInLeaderboard ?? false);
      setAllowAnalytics(settings.allowAnalytics ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ publicProfile, showInLeaderboard, allowAnalytics });
      toast.success('Privacy settings updated');
    } catch (error) {
      toast.error('Failed to update privacy settings');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/user/export-data');
      if (!res.ok) throw new Error('Export failed');
      toast.success('Data export initiated. You will receive an email with your data.');
    } catch (error) {
      toast.error('Failed to export data. Please try again.');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const ToggleRow = ({
    id,
    label,
    description,
    checked,
    onChange,
  }: {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
      <div>
        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="text-xs text-zinc-500 font-medium mt-0.5">{description}</div>
      </div>
      <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={isUpdatingPrivacy}
        />
        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600" />
      </label>
    </div>
  );

  return (
    <GlassCard className={`p-8 flex flex-col gap-8 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Privacy Settings
          </h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Visibility</p>
      </div>

      <div className="space-y-3">
        <ToggleRow
          id="publicProfile"
          label="Public Profile"
          description="Allow others to view your profile and progress"
          checked={publicProfile}
          onChange={setPublicProfile}
        />
        <ToggleRow
          id="showInLeaderboard"
          label="Show in Leaderboard"
          description="Display your ranking in public leaderboards"
          checked={showInLeaderboard}
          onChange={setShowInLeaderboard}
        />
        <ToggleRow
          id="allowAnalytics"
          label="Usage Analytics"
          description="Help us improve by sharing anonymous usage data"
          checked={allowAnalytics}
          onChange={setAllowAnalytics}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? 'Saving...' : 'Save Privacy Settings'}
      </button>

      {/* Data Privacy */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Data Privacy</h4>
        <button
          onClick={handleDownloadData}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {isDownloading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isDownloading ? 'Requesting Export...' : 'Download My Data'}
        </button>
        <p className="text-xs text-zinc-400 mt-2 font-medium">
          Request a copy of all your data. You will receive an email with the download link.
        </p>
      </div>
    </GlassCard>
  );
};

export default PrivacySettings;
