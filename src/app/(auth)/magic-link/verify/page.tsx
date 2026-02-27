// app/(auth)/magic-link/verify/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyMagicLink();
    } else {
      setStatus('error');
      setError('Invalid verification link');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyMagicLink = async () => {
    try {
      const result = await signIn('email', {
        token,
        redirect: false,
      });

      if (result?.error) {
        setStatus('error');
        setError(result.error);
      } else if (result?.ok) {
        setStatus('success');
        setTimeout(() => {
          router.push(callbackUrl);
        }, 2000);
      }
    } catch (err) {
      console.error('Magic link verification error:', err);
      setStatus('error');
      setError('Verification failed. Please try again.');
    }
  };

  return (
    <div className="p-8">
      {status === 'verifying' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Verifying magic link...
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we sign you in
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Success!
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You've been signed in successfully
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Failed
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'The magic link is invalid or has expired.'}
          </p>

          <div className="flex gap-3 justify-center">
            <Link
              href="/magic-link"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request New Link
            </Link>

            <Link
              href="/login"
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}