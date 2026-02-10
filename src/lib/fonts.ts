// ============================================================================
// FILE: src/lib/fonts.ts
// PURPOSE: Font configuration using next/font
// ============================================================================

import { Inter, JetBrains_Mono } from 'next/font/google';

// PRIMARY FONT (Sans-serif for UI):
export const fontSans = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
});

// MONOSPACE FONT (for code, stats):
export const fontMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
    weight: ['400', '500', '700'],
});

// FONT CLASSES EXPORT:
// Combine all font variables for className
export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;
