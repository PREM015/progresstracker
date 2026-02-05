// app/(auth)/forgot-password/page.tsx
import React from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';

export const metadata = {
  title: 'Forgot Password - ProgressTracker',
  description: 'Reset your password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Forgot Password?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          No worries, we'll send you reset instructions
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}