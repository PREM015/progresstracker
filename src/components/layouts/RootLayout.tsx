'use client';

import React from 'react';

interface RootLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const RootLayout: React.FC<RootLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <html lang="en">
      <body className={className}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
