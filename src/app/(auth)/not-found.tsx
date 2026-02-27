// app/(auth)/not-found.tsx
import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Page Not Found
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The authentication page you&apos;re looking for doesn&apos;t exist.
      </p>

      <Link
        href="/login"
        className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Login
      </Link>
    </div>
  );
}