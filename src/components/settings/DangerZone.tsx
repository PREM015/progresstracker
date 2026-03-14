'use client';

import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { GlassCard } from '@/components/ui/GlassCard';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DangerZoneProps {
  className?: string;
}

export const DangerZone: React.FC<DangerZoneProps> = ({ className = '' }) => {
  const { deleteAccount, isDeletingAccount } = useUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);

  const handleDeleteData = async () => {
    setIsDeletingData(true);
    try {
      const res = await fetch('/api/user/export-data', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete data');
      toast.success('All tracker data has been deleted successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete data. Please try again.');
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirmText !== 'DELETE') return;
    deleteAccount(undefined, {
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to delete account. Please try again.');
      },
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <GlassCard className="overflow-hidden border-2 border-red-200 dark:border-red-800/50">
        <div className="p-6 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 tracking-tight">Danger Zone</h3>
        </div>

        <div className="p-8 space-y-6">
          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-500/5">
            <div>
              <div className="font-bold text-zinc-900 dark:text-zinc-50">Delete All Tracker Data</div>
              <div className="text-sm text-zinc-500 font-medium mt-0.5">
                Permanently delete all your progress, goals, and sync data. Your account will remain.
              </div>
            </div>
            <button
              onClick={handleDeleteData}
              disabled={isDeletingData}
              className="ml-4 px-4 py-2 border border-red-500 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {isDeletingData && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Data
            </button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-500/5">
            <div>
              <div className="font-bold text-zinc-900 dark:text-zinc-50">Delete Account</div>
              <div className="text-sm text-zinc-500 font-medium mt-0.5">
                Permanently delete your account and all associated data. This cannot be undone.
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-red-200 dark:border-red-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Delete Account?</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
              This action <strong>cannot be undone</strong>. All your data, progress, achievements, goals,
              and platform connections will be permanently deleted.
            </p>
            <div className="mb-6 space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500">
                Type <span className="text-red-500 font-mono">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 border-2 border-red-300 dark:border-red-700 rounded-xl focus:outline-none focus:border-red-500 bg-transparent font-mono text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || isDeletingAccount}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeletingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingAccount ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DangerZone;
