'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

// PROVIDER COMPONENT:
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"           // Add theme class to html element
            defaultTheme="system"       // Follow system preference by default
            enableSystem={true}         // Allow system theme detection
            disableTransitionOnChange   // Prevent flash during theme switch
            storageKey="theme"          // localStorage key
            themes={['light', 'dark']}  // Available themes
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
