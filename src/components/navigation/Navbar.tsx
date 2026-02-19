// ============================================================================
// FILE: src/components/navigation/Navbar.tsx
// PURPOSE: Global navigation and dashboard header
// ============================================================================

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { Moon, Sun, Menu, X, LogOut, User, Settings, Shield, ChevronRight, Search, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar } from '@/components/common/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PUBLIC_ROUTES, DASHBOARD_ROUTES, ADMIN_ROUTES, SETTINGS_ROUTES } from '@/constants/routes';
import { Magnetic } from '@/components/ui/motion/Magnetic';

interface NavbarProps {
  variant?: 'default' | 'dashboard';
  className?: string;
}

export function Navbar({ variant = 'default', className }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navLinks = [
    { href: PUBLIC_ROUTES.HOME, label: 'Home', public: true },
    { href: PUBLIC_ROUTES.FEATURES, label: 'Features', public: true },
    { href: PUBLIC_ROUTES.PRICING, label: 'Pricing', public: true },
    { href: DASHBOARD_ROUTES.HOME, label: 'Dashboard', public: false },
  ];

  const filteredLinks = navLinks.filter(
    (link) => link.public || (session && !link.public)
  );

  // Simple Breadcrumbs generation based on path
  const breadcrumbs = pathname.split('/').filter(Boolean).map((segment, index) => {
    // Capitalize first letter and replace hyphens
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  });

  return (
    <nav
      className={cn(
        "transition-all duration-300 sticky top-0 z-40 border-b",
        variant === 'dashboard'
          ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 px-4 md:px-6"
          : "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      <div className={cn("flex h-16 items-center justify-between relative", variant === 'default' && "container mx-auto px-6")}>
        {/* Left: Logo or Breadcrumbs */}
        <div className="flex items-center gap-6">
          {variant === 'default' ? (
            <Link href="/" className="font-semibold text-lg flex items-center gap-2 text-zinc-900 dark:text-zinc-50 shrink-0 group">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs text-white font-bold shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-110">PT</span>
              <span className="tracking-tight hidden sm:inline-block font-bold">Progress<span className="text-indigo-600 dark:text-indigo-400">Tracker</span></span>
            </Link>
          ) : (
            // Dashboard Breadcrumbs
            <div className="flex items-center text-sm">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-zinc-500 font-medium">Dashboard</span>
                {breadcrumbs.length > 0 && <ChevronRight className="w-4 h-4 text-zinc-400" />}
              </div>

              {breadcrumbs.length > 0 ? (
                <div className="flex items-center">
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center capitalize">
                      {i > 0 && <ChevronRight className="w-4 h-4 mx-1 text-zinc-400" />}
                      <span className={cn(
                        "font-semibold",
                        i === breadcrumbs.length - 1 ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"
                      )}>
                        {crumb}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="font-bold text-zinc-900 dark:text-zinc-50 md:hidden">Overview</span>
              )}
            </div>
          )}
        </div>

        {/* Center: Desktop Access Links for Landing */}
        {variant === 'default' && (
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 gap-1 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium px-4 py-1.5 rounded-full transition-all duration-200',
                  pathname === link.href
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Dashboard Search Bar (Desktop) */}
        {variant === 'dashboard' && (
          <div className="hidden max-w-md w-full mx-auto md:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Search anything... (Cmd+K)"
                className="pl-10 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50 focus:bg-white dark:focus:bg-zinc-900 transition-all rounded-xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-1.5 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400 opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {variant === 'dashboard' && (
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950" />
            </Button>
          )}

          <Magnetic>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </Magnetic>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-zinc-200 dark:hover:ring-zinc-800 transition-all p-0 overflow-hidden">
                  <Avatar
                    src={session.user?.image || undefined}
                    alt={session.user?.name || 'User'}
                    fallback={session.user?.name || '?'}
                    size="sm"
                    className="h-full w-full"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email || ''}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={DASHBOARD_ROUTES.HOME}>
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={SETTINGS_ROUTES.ACCOUNT}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={ADMIN_ROUTES.DASHBOARD}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Button variant="ghost" asChild className="text-zinc-600 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-500/10 rounded-full px-6">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl absolute top-16 left-0 right-0 shadow-lg animate-in slide-in-from-top-5 z-50 h-[calc(100vh-4rem)]">
          <div className="flex flex-col p-4 space-y-4">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'text-lg font-medium transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900',
                  pathname === link.href
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {link.label}
              </Link>
            ))}
            {!session && (
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button variant="outline" asChild className="w-full justify-center rounded-xl h-12">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="w-full justify-center rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700">
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
