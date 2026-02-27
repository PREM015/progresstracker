'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileSettingsProps {
  className?: string;
}

interface ProfileData {
  name: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  company: string;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  className = '',
}) => {
  const { user, isLoading } = useUser();
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    company: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        company: user.company || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("glass-card p-6 space-y-4 animate-pulse", className)}>
        <div className="h-8 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
          <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
        </div>
        <div className="h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm";
  const labelClasses = "block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1";

  return (
    <div className={cn("glass-card p-8 flex flex-col gap-8", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">Profile Details</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Settings</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className={labelClasses}>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClasses}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1">
            <label className={labelClasses}>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClasses}
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClasses}>Biography</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className={cn(inputClasses, "resize-none capitalize-first")}
            placeholder="Tell us about your journey..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className={labelClasses}>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={inputClasses}
              placeholder="San Francisco, CA"
            />
          </div>

          <div className="space-y-1">
            <label className={labelClasses}>Company / Organization</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className={inputClasses}
              placeholder="Tech Corp"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClasses}>Personal Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className={inputClasses}
            placeholder="https://portfolio.me"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-4 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSaving ? 'Synchronizing...' : 'Save Profile Changes'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
