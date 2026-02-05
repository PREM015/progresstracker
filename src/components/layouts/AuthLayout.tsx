// components/layouts/AuthLayout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();
  
  const isLogin = pathname?.includes('/login');
  const isRegister = pathname?.includes('/register');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ProgressTracker
            </h1>
          </Link>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {children}
        </div>

        {/* Toggle Link */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin && (
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Sign up
              </Link>
            </p>
          )}
          {isRegister && (
            <p>
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-500">
          <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 mx-2">
            Terms
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 mx-2">
            Privacy
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-gray-700 dark:hover:text-gray-300 mx-2">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}