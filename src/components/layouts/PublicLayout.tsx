'use client';

import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-white ${className}`}>
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-indigo-600">Progress Tracker</a>
          <nav className="flex items-center gap-6">
            <a href="/about" className="text-gray-700 hover:text-indigo-600">About</a>
            <a href="/blog" className="text-gray-700 hover:text-indigo-600">Blog</a>
            <a href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Login
            </a>
          </nav>
        </div>
      </header>

      <main>
        {children}
      </main>

      <footer className="border-t border-gray-200 mt-auto py-8">
        <div className="container mx-auto px-6 text-center text-gray-600 text-sm">
          © 2024 Progress Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
