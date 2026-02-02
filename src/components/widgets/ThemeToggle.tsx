/**
 * Component: ThemeToggle
 * Location: components/widgets/ThemeToggle.tsx
 * 
 * Description: Theme switcher (light/dark/system)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const ComputerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
);

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <ComputerIcon />,
};

const STORAGE_KEY = 'theme';

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    const resolvedTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [getSystemTheme]);

  // Update theme
  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between themes
  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateTheme(nextTheme);
  }, [theme, updateTheme]);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = stored || 'system';
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme, theme]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <div className="w-5 h-5 rounded-full bg-[var(--sidebar-bg)] animate-pulse" />
      </Button>
    );
  }

  // Button variant - cycles through themes
  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon' : 'sm'}
        onClick={toggleTheme}
        className={cn('relative', className)}
        title={`Theme: ${themeLabels[theme]}`}
      >
        <span className="transition-transform duration-200">
          {themeIcons[theme]}
        </span>
        {showLabel && <span className="ml-2">{themeLabels[theme]}</span>}
      </Button>
    );
  }

  // Dropdown variant - shows all options
  if (variant === 'dropdown') {
    const items: DropdownItem[] = [
      { label: 'Light', value: 'light', icon: <SunIcon /> },
      { label: 'Dark', value: 'dark', icon: <MoonIcon /> },
      { label: 'System', value: 'system', icon: <ComputerIcon /> },
    ];

    return (
      <Dropdown
        trigger={
          <Button variant="ghost" size="icon" className={className}>
            {themeIcons[theme]}
          </Button>
        }
        items={items}
        onSelect={(value) => updateTheme(value as Theme)}
        className={className}
      />
    );
  }

  // Switch variant - toggle between light and dark only
  return (
    <button
      onClick={() => updateTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'relative inline-flex items-center h-8 rounded-full w-14 transition-colors',
        theme === 'dark' ? 'bg-[var(--primary)]' : 'bg-[var(--card-border)]',
        className
      )}
      role="switch"
      aria-checked={theme === 'dark'}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={cn(
          'absolute left-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow transition-transform',
          theme === 'dark' && 'translate-x-6'
        )}
      >
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
};

export default ThemeToggle;
