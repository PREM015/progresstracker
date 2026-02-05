// components/auth/AccountDeletion.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import apiClient from '@/lib/apiClient';

export default function AccountDeletion() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/user/delete', {
        password,
        reason,
      });

      if (response.error) {
        setError(response.error);
      } else {
        await signOut({ redirect: false });
        router.push('/');
      }
    } catch (err) {
      console.error('Account deletion error:', err);
      setError('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Permanently delete account
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Delete My Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Before you go, please note:
        </h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
          <li>All your tracker data will be deleted</li>
          <li>Your goals and achievements will be removed</li>
          <li>Connected platforms will be disconnected</li>
          <li>This action is irreversible</li>
        </ul>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Confirm Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all outline-none"
          placeholder="Enter your password"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason for leaving (optional)
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all outline-none resize-none"
          placeholder="Help us improve by telling us why you're leaving"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={loading || !password}
          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </span>
          ) : (
            'Yes, Delete My Account'
          )}
        </button>

        <button
          onClick={() => {
            setShowConfirm(false);
            setPassword('');
            setReason('');
            setError('');
          }}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}