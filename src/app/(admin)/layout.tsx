import { ReactNode } from 'react';

/**
 * Admin Layout
 * 
 * @created 2026-01-26
 */

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      {/* TODO: Add admin navigation/sidebar */}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
