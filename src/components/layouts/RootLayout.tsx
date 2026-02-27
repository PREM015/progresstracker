// ============================================================================
// FILE: src/components/layouts/RootLayout.tsx
// PURPOSE: Main root layout wrapper with Providers and font configuration
// ============================================================================

import { Providers } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import '@/app/globals.css';

import { Session } from 'next-auth';

interface RootLayoutProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function RootLayout({ children, session }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <head>
        {/* Theme flash prevention — runs synchronously before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                  document.documentElement.style.colorScheme = theme;
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontVariables
        )}
      >
        <Providers session={session}>
          {children}
        </Providers>
      </body >
    </html >
  );
}
