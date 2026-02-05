// components/auth/TwoFactorVerify.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';

export default function TwoFactorVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || (useBackupCode ? code.length < 8 : code.length !== 6)) {
      setError('Please enter a valid code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/2fa/verify', {
        code,
        method: useBackupCode ? 'backup_code' : 'totp',
      });

      if (response.error) {
        setError(response.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {useBackupCode ? 'Backup Code' : 'Authentication Code'}
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => {
            const value = useBackupCode 
              ? e.target.value.toUpperCase()
              : e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(value);
            setError('');
          }}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none text-center text-2xl tracking-widest font-mono"
          placeholder={useBackupCode ? 'XXXX-XXXX-XXXX' : '000000'}
          maxLength={useBackupCode ? 14 : 6}
          autoComplete="off"
          autoFocus
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          {useBackupCode 
            ? 'Enter one of your backup codes' 
            : 'Enter the 6-digit code from your authenticator app'
          }
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !code}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying...
          </span>
        ) : (
          'Verify'
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setUseBackupCode(!useBackupCode);
          setCode('');
          setError('');
        }}
        className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        {useBackupCode ? '← Use authenticator app' : 'Use backup code instead'}
      </button>
    </form>
  );
}