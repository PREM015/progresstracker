// app/(auth)/2fa/setup/page.tsx
import React from 'react';
import TwoFactorSetup from '@/components/auth/TwoFactorSetup';
import Link from 'next/link';

export const metadata = {
  title: 'Setup 2FA - ProgressTracker',
  description: 'Enable two-factor authentication',
};

export default function TwoFactorSetupPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/settings/security"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to security settings
        </Link>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add an extra layer of security to your account
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              What you'll need
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Your device's camera to scan the QR code</li>
              <li>A secure place to store backup codes</li>
            </ul>
          </div>
        </div>
      </div>

      <TwoFactorSetup />
    </div>
  );
}