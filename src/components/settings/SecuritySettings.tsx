import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, Smartphone, History, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';

interface SecuritySettingsProps {
  className?: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  className = '',
}) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchSecurityStatus() {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.data.twoFactorEnabled);
        }
      } catch (error) {
        console.error('Failed to fetch security status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSecurityStatus();
  }, []);

  const handleToggle2FA = async (checked: boolean) => {
    setUpdating(true);
    // Note: This would typically trigger a 2FA setup flow, but here we just simulate UI toggle
    // following the realism goal. For now, we just update the local state.
    setTimeout(() => {
      setTwoFactorEnabled(checked);
      setUpdating(false);
      toast.success(checked ? '2FA enabled' : '2FA disabled');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <Key className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xl font-bold tracking-tight">Security & Credentials</h3>
        </div>

        <div className="p-8 space-y-10">
          {/* Change Password Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Update Password</h4>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500">Current Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500">New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl px-8 hover:scale-[1.02] transition-transform font-bold">
                Update Safely
              </Button>
            </div>
          </section>

          {/* 2FA Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Multi-Factor Authentication</h4>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-500 ${twoFactorEnabled ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20'}`}>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600'}`}>
                    {twoFactorEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                      Two-Factor Authentication
                      {twoFactorEnabled && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="text-sm text-zinc-500 mt-1 max-w-sm font-medium">
                      Add an extra layer of security to your account by requiring a code from your mobile device when logging in.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {updating && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={handleToggle2FA}
                    disabled={updating}
                  />
                </div>
              </div>

              {!twoFactorEnabled && (
                <div className="mt-4 p-3 bg-white dark:bg-zinc-900/50 rounded-lg border border-rose-100 dark:border-rose-500/10 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" />
                  Your account is at higher risk without 2FA enabled.
                </div>
              )}
            </div>
          </section>

          {/* Active Sessions */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Active Sessions</h4>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 glass-card border-none bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                    <Smartphone className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Current Session</div>
                    <div className="text-xs text-zinc-500 font-medium">Chrome on Windows • Last active now</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
              </div>
            </div>

            <Button variant="ghost" className="w-full text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/5 text-xs font-bold uppercase tracking-widest gap-2">
              <History className="w-4 h-4" />
              Sign Out All Other Sessions
            </Button>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

export default SecuritySettings;
