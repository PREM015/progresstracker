import { ReactNode } from 'react';

/**
 * Root Layout
 * 
 * @created 2026-01-26
 */

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="root-layout">
      {/* TODO: Add root navigation/sidebar */}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
