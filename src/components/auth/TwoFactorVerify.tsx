// components/auth/TwoFactorSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import Image from 'next/image';

export default function TwoFactorSetup() {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await apiClient.post('/auth/2fa/setup');
      
      if (response.error) {
        setError(response.error);
      } else {
        setSetupData(response.data);
      }
    } catch (err) {
      console.error('2FA setup error:', err);
      setError('Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/2fa/verify', {
        code: verificationCode,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setStep('complete');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          2FA Enabled Successfully!
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your account is now protected with two-factor authentication
        </p>

        {setupData?.backupCodes && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              <strong>Save your backup codes!</strong> You can use these to access your account if you lose your authenticator device.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {setupData.backupCodes.map((code, i) => (
                <div key={i} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => window.location.href = '/settings/security'}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Security Settings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {step === 'setup' && setupData && (
        <>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scan QR Code
            </h3>
            
            <div className="inline-block p-4 bg-white rounded-lg">
              <Image
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                width={200}
                height={200}
              />
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Scan this QR code with your authenticator app
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Can't scan? Enter this code manually:
            </p>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
              {setupData.secret}
            </p>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            I've Scanned the Code
          </button>
        </>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>

          <button
            type="button"
            onClick={() => setStep('setup')}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back to QR Code
          </button>
        </form>
      )}
    </div>
  );
}