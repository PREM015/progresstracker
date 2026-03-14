'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, Monitor, History, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';

interface SecuritySettingsProps {
  className?: string;
}

type TwoFAStep = 'idle' | 'setup' | 'verifying' | 'disabling' | 'done';

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ className = '' }) => {
  // --- 2FA state ---
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('idle');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  // --- Password state ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // --- Sessions state ---
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);

  // Load 2FA status
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/user/2fa');
        if (res.ok) {
          const data = await res.json();
          setTwoFactorEnabled(data.data?.isEnabled ?? false);
        }
      } catch (err) {
        console.error('Failed to load 2FA status', err);
      } finally {
        setLoadingStatus(false);
      }
    }
    loadStatus();
  }, []);

  // Load sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/user/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.data?.sessions || []);
        }
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setSessionsLoading(false);
      }
    }
    loadSessions();
  }, []);

  // --- Change Password ---
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.errors?.[0]?.message || data?.error || data?.message || 'Failed to change password';
        throw new Error(errMsg);
      }
      toast.success('Password changed successfully. Other sessions have been logged out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // --- 2FA: Initiate setup ---
  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const res = await fetch('/api/user/2fa', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to setup 2FA');
      }
      setQrCode(data.data.qrCode);
      setBackupCodes(data.data.backupCodes || []);
      setTwoFAStep('setup');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initiate 2FA setup');
    } finally {
      setTwoFALoading(false);
    }
  };

  // --- 2FA: Verify and enable ---
  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    setTwoFALoading(true);
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Invalid code');
      }
      setTwoFactorEnabled(true);
      setTwoFAStep('done');
      setVerifyCode('');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to verify 2FA code');
    } finally {
      setTwoFALoading(false);
    }
  };

  // --- 2FA: Disable ---
  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter your 6-digit authenticator code');
      return;
    }
    if (!disablePassword) {
      toast.error('Please enter your account password');
      return;
    }
    setTwoFALoading(true);
    try {
      const res = await fetch('/api/user/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode, password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to disable 2FA');
      }
      setTwoFactorEnabled(false);
      setTwoFAStep('idle');
      setDisableCode('');
      setDisablePassword('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  // --- Revoke all sessions ---
  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      const res = await fetch('/api/user/sessions', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to revoke sessions');
      toast.success(`${data.data?.sessionsRevoked ?? 0} session(s) revoked`);
      // Refresh sessions
      const refreshed = await fetch('/api/user/sessions');
      if (refreshed.ok) {
        const rd = await refreshed.json();
        setSessions(rd.data?.sessions || []);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  if (loadingStatus) {
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
          {/* ── Change Password ── */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Update Password</h4>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-zinc-500">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-transparent border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 rounded-xl font-medium max-w-sm"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-400">
              Password must be at least 8 characters with uppercase, lowercase, a number, and a special character.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={passwordSaving}
                className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl px-8 hover:scale-[1.02] transition-transform font-bold"
              >
                {passwordSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </div>
          </section>

          {/* ── 2FA Section ── */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Two-Factor Authentication</h4>
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
                      {twoFactorEnabled
                        ? '2FA is active. Your account is protected with an authenticator app.'
                        : 'Add an extra layer of security. Requires a code from your authenticator app at login.'}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (twoFactorEnabled) {
                      setTwoFAStep('disabling');
                    } else if (twoFAStep === 'idle' || twoFAStep === 'done') {
                      handleSetup2FA();
                    }
                  }}
                  disabled={twoFALoading}
                  variant={twoFactorEnabled ? 'outline' : 'default'}
                  className={`rounded-xl font-bold text-xs ml-4 ${!twoFactorEnabled && 'bg-indigo-600 hover:bg-indigo-700 text-white border-none'}`}
                >
                  {twoFALoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>

              {/* Setup flow: QR Code */}
              {twoFAStep === 'setup' && (
                <div className="mt-6 space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  {qrCode && (
                    <div className="flex justify-center">
                      <img src={qrCode} alt="2FA QR Code" className="w-40 h-40 rounded-xl border-4 border-white shadow-lg" />
                    </div>
                  )}
                  {backupCodes.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                      <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
                        Save these backup codes — shown only once!
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {backupCodes.map((code) => (
                          <code key={code} className="text-xs font-mono text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">2. Enter the 6-digit code from your app:</p>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      className="max-w-[140px] text-center text-xl font-mono tracking-widest"
                    />
                    <Button onClick={handleVerify2FA} disabled={twoFALoading || verifyCode.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                      {twoFALoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Verify & Enable
                    </Button>
                    <Button variant="ghost" onClick={() => { setTwoFAStep('idle'); setVerifyCode(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Disable 2FA flow */}
              {twoFAStep === 'disabling' && (
                <div className="mt-6 space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">To disable 2FA, enter your authenticator code and password:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-zinc-500">Authenticator Code</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center font-mono tracking-widest"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-zinc-500">Account Password</Label>
                      <Input
                        type="password"
                        placeholder="Your password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDisable2FA}
                      disabled={twoFALoading}
                      variant="destructive"
                      className="rounded-xl"
                    >
                      {twoFALoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Confirm Disable
                    </Button>
                    <Button variant="ghost" onClick={() => { setTwoFAStep('idle'); setDisableCode(''); setDisablePassword(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!twoFactorEnabled && twoFAStep === 'idle' && (
                <div className="mt-4 p-3 bg-white dark:bg-zinc-900/50 rounded-lg border border-rose-100 dark:border-rose-500/10 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" />
                  Your account is at higher risk without 2FA enabled.
                </div>
              )}
            </div>
          </section>

          {/* ── Active Sessions ── */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Active Sessions</h4>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <div className="space-y-3">
              {sessionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin h-5 w-5 text-zinc-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex items-center justify-between p-4 glass-card border-none bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                      <Monitor className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Current Session</div>
                      <div className="text-xs text-zinc-500 font-medium">Active now</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                  </div>
                </div>
              ) : (
                sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 glass-card border-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors ${session.isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'bg-zinc-50/50 dark:bg-zinc-900/40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                        <Monitor className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                          {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                          {session.isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                              This device
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {session.city ? `${session.city}, ` : ''}{session.country || 'Unknown location'} •{' '}
                          {session.lastActiveAt
                            ? new Date(session.lastActiveAt).toLocaleDateString()
                            : 'Unknown time'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.isCurrent ? (
                        <>
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                        </>
                      ) : (
                        <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Other</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleRevokeAllSessions}
              disabled={revokingAll}
              className="w-full text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/5 text-xs font-bold uppercase tracking-widest gap-2"
            >
              {revokingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {revokingAll ? 'Signing Out...' : 'Sign Out All Other Sessions'}
            </Button>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

export default SecuritySettings;
