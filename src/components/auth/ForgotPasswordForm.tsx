// components/auth/ForgotPasswordForm.tsx
'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import apiClient from '@/lib/apiClient';
import Link from 'next/link';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });

      if (response.error) {
        setError(response.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Check your email
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We've sent password reset instructions to <strong>{email}</strong>
        </p>

        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              try again
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all outline-none"
          placeholder="you@example.com"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </span>
        ) : (
          'Send Reset Link'
        )}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to login
        </Link>
      </div>
    </form>
  );
}