// app/(auth)/2fa/verify/page.tsx
import React from 'react';
import TwoFactorVerify from '@/components/auth/TwoFactorVerify';

export const metadata = {
  title: 'Verify 2FA - ProgressTracker',
  description: 'Enter your authentication code',
};

export default function TwoFactorVerifyPage() {
  return (
    <div className="p-8">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter the code from your authenticator app
        </p>
      </div>

      <TwoFactorVerify />
    </div>
  );
}