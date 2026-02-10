// ============================================================================
// FILE: src/components/layouts/PublicLayout.tsx
// PURPOSE: Layout for public pages (landing, about, etc.)
// ============================================================================

import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/navigation/Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
