'use client';

import React from 'react';

interface NavbarProps {
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  className = '',
}) => {
  return (
    <nav className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-2xl font-bold text-indigo-600">Progress Tracker</div>

        <div className="hidden md:flex items-center gap-8">
          <a href="/features" className="text-gray-700 hover:text-indigo-600">Features</a>
          <a href="/pricing" className="text-gray-700 hover:text-indigo-600">Pricing</a>
          <a href="/about" className="text-gray-700 hover:text-indigo-600">About</a>
          <a href="/blog" className="text-gray-700 hover:text-indigo-600">Blog</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/login" className="text-gray-700 hover:text-indigo-600 font-medium">Login</a>
          <a href="/signup" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Sign Up
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
