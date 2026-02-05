// components/auth/VerifyEmailForm.tsx
'use client';

import React, { useState } from 'react';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';

interface VerifyEmailFormProps {
  email?: string;
}

export default function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/resend-verification', { email });

      if (response.error) {
        setError(response.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Verify your email
      </h3>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {email ? (
          <>We've sent a verification link to <strong>{email}</strong></>
        ) : (
          'Please check your email for a verification link'
        )}
      </p>

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            Verification email sent! Check your inbox.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Didn't receive the email?{' '}
          <button
            onClick={handleResend}
            disabled={loading || !email}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Resend verification email'}
          </button>
        </p>

        <Link
          href="/login"
          className="inline-block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  );
}