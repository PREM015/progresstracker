  // src/components/layouts/AdminLayout.tsx
  'use client';
import Image from 'next/image';

  import { useState, useEffect, useCallback, createContext, useContext } from 'react';
  import Link from 'next/link';
  import { usePathname, useRouter } from 'next/navigation';

  // =============================================================================
  // TYPES
  // =============================================================================

  interface AdminUser {
    name: string | null;
    email: string | null;
    image: string | null;
  }

  interface NavItem {
    name: string;
    href: string;
    icon: string;
    badge?: number;
  }

  interface AdminContextType {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    refreshData: () => void;
  }

  // =============================================================================
  // CONTEXT
  // =============================================================================

  const AdminContext = createContext<AdminContextType | null>(null);

  export function useAdmin() {
    const context = useContext(AdminContext);
    if (!context) throw new Error('useAdmin must be used within AdminLayoutClient');
    return context;
  }

  // =============================================================================
  // ICONS (Inline SVG)
  // =============================================================================

  const Icons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    platforms: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    sync: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    analytics: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    achievements: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    goals: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    billing: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    support: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    feedback: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    auditLogs: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    featureFlags: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    maintenance: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    database: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    waitlist: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    blog: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    menu: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    close: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    logout: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    chevronDown: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ),
  };

  // =============================================================================
  // NAVIGATION CONFIG
  // =============================================================================

  const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/admin', icon: 'dashboard' },
        { name: 'Analytics', href: '/admin/analytics', icon: 'analytics' },
        { name: 'Metrics', href: '/admin/metrics', icon: 'analytics' },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'Users', href: '/admin/users', icon: 'users' },
        { name: 'Platforms', href: '/admin/platforms', icon: 'platforms' },
        { name: 'Achievements', href: '/admin/achievements', icon: 'achievements' },
        { name: 'Goal Templates', href: '/admin/goal-templates', icon: 'goals' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { name: 'Sync', href: '/admin/sync', icon: 'sync' },
        { name: 'Support Tickets', href: '/admin/support-tickets', icon: 'support' },
        { name: 'Feedback', href: '/admin/feedback', icon: 'feedback' },
        { name: 'Waitlist', href: '/admin/waitlist', icon: 'waitlist' },
      ],
    },
    {
      title: 'Content',
      items: [
        { name: 'Blog', href: '/admin/blog', icon: 'blog' },
        { name: 'Changelog', href: '/admin/changelog', icon: 'auditLogs' },
        { name: 'Newsletter', href: '/admin/newsletter', icon: 'email' },
        { name: 'Email Templates', href: '/admin/email', icon: 'email' },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Feature Flags', href: '/admin/feature-flags', icon: 'featureFlags' },
        { name: 'System Settings', href: '/admin/system-settings', icon: 'settings' },
        { name: 'Maintenance', href: '/admin/maintenance', icon: 'maintenance' },
        { name: 'Database', href: '/admin/database', icon: 'database' },
        { name: 'Cache', href: '/admin/cache', icon: 'database' },
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: 'auditLogs' },
        { name: 'System Logs', href: '/admin/logs', icon: 'auditLogs' },
      ],
    },
    {
      title: 'Billing',
      items: [
        { name: 'Billing', href: '/admin/billing', icon: 'billing' },
        { name: 'Reports', href: '/admin/reports', icon: 'analytics' },
      ],
    },
  ];

  // =============================================================================
  // MAIN COMPONENT
  // =============================================================================

  export function AdminLayoutClient({
    children,
    user,
  }: {
    children: React.ReactNode;
    user: AdminUser;
  }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

    // Close sidebar on route change
    useEffect(() => {
      // Defer state update to avoid cascading renders
      const id = requestAnimationFrame(() => setSidebarOpen(false));
      return () => cancelAnimationFrame(id);
    }, [pathname]);


    const refreshData = useCallback(() => {
      setRefreshKey((k) => k + 1);
      router.refresh();
    }, [router]);

    const handleLogout = async () => {
      await fetch('/api/auth/logout-custom', { method: 'POST' });
      router.push('/login');
    };

    return (
      <AdminContext.Provider value={{ sidebarOpen, setSidebarOpen, refreshData }}>
        <div className="min-h-screen bg-zinc-950">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`
              fixed top-0 left-0 z-50 h-full w-64 bg-zinc-900 border-r border-zinc-800
              transform transition-transform duration-200 ease-in-out
              lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-sm">PT</span>
                </div>
                <span className="text-white font-semibold">Admin</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-zinc-400 hover:text-white"
              >
                {Icons.close}
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href ||
                        (item.href !== '/admin' && pathname.startsWith(item.href));

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                              ${isActive
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }
                            `}
                          >
                            <span className={isActive ? 'text-black' : ''}>
                              {Icons[item.icon as keyof typeof Icons] || Icons.dashboard}
                            </span>
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="lg:pl-64">
            {/* Header */}
            <header className="h-16 bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-30">
              <div className="h-full px-4 flex items-center justify-between">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-zinc-400 hover:text-white"
                >
                  {Icons.menu}
                </button>

                {/* Breadcrumb */}
                <div className="hidden lg:flex items-center gap-2 text-sm">
                  <Link href="/admin" className="text-zinc-400 hover:text-white">
                    Admin
                  </Link>
                  {pathname !== '/admin' && (
                    <>
                      <span className="text-zinc-600">/</span>
                      <span className="text-white capitalize">
                        {pathname.split('/').pop()?.replace(/-/g, ' ')}
                      </span>
                    </>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                  {/* Back to app */}
                  <Link
                    href="/dashboard"
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    ← Back to App
                  </Link>

                  {/* User menu */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            
{user.image ? (
  <Link href="/somewhere">
    <a>
      <Image
        src={user.image || '/default.png'}
        alt={user.name || 'Admin'}
        width={32}
        height={32}
        className="rounded-full"
      />
    </a>
  </Link>
) : (
  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
    <span className="text-sm font-medium text-white">
      {user.name?.[0]?.toUpperCase() || 'A'}
    </span>
  </div>
)}
                      {Icons.chevronDown}
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="p-3 border-b border-zinc-700">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || 'Admin'}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 rounded-md transition-colors"
                        >
                          {Icons.logout}
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="p-4 lg:p-6" key={refreshKey}>
              {children}
            </main>
          </div>
        </div>
      </AdminContext.Provider>
    );
  }

  export default AdminLayoutClient;