'use client';

import React from 'react';

interface MinimalLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const MinimalLayout: React.FC<MinimalLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-8 ${className}`}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

export default MinimalLayout;
