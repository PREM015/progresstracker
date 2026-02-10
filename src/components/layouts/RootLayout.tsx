// ============================================================================
// FILE: src/components/layouts/RootLayout.tsx
// PURPOSE: Main root layout wrapper with Providers and font configuration
// ============================================================================

import { Providers } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import '@/app/globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontVariables
        )}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
