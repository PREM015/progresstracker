'use client';

import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import '@/app/globals.css';
import React from 'react';

// FONT CONFIGURATION (re-declared here or imported from lib/fonts if client component issues allow)
// Importing from lib/fonts is better if it works with 'use client' or passed from server component
import { fontSans, fontMono } from '@/lib/fonts';

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable,
          fontMono.variable
        )}
      >
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
