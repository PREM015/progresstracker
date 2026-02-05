/* eslint-disable @typescript-eslint/no-unused-vars */
// components/navigation/LogoutButton.tsx
'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    
    setLoading(true);
    
    try {
      // Call custom cleanup API
      await fetch('/api/auth/logout-custom', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out using NextAuth
      await signOut({ 
        redirect: true,
        callbackUrl: '/login'
      });
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}