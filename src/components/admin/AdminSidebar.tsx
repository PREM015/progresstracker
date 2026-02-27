'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const menuItems = [
        { icon: '📊', label: 'Dashboard', href: '/admin' },
        { icon: '👥', label: 'Users', href: '/admin/users' },
        { icon: '🔌', label: 'Platforms', href: '/admin/platforms' },
        { icon: '🚩', label: 'Feature Flags', href: '/admin/feature-flags' },
        { icon: '📝', label: 'Audit Logs', href: '/admin/audit-logs' },
        { icon: '⚙️', label: 'Settings', href: '/admin/system-settings' },
        { icon: '📧', label: 'Email', href: '/admin/email' },
        { icon: '✉️', label: 'Newsletter', href: '/admin/newsletter' },
        { icon: '📰', label: 'Blog', href: '/admin/blog' },
        { icon: '🎯', label: 'Goal Templates', href: '/admin/goal-templates' },
        { icon: '🏆', label: 'Achievements', href: '/admin/achievements' },
        { icon: '🎫', label: 'Support', href: '/admin/support-tickets' },
        { icon: '💰', label: 'Billing', href: '/admin/billing' },
        { icon: '📈', label: 'Analytics', href: '/admin/analytics' },
        { icon: '📊', label: 'Metrics', href: '/admin/metrics' },
        { icon: '🔄', label: 'Sync', href: '/admin/sync' },
        { icon: '🛠️', label: 'Maintenance', href: '/admin/maintenance' },
        { icon: '🗄️', label: 'Database', href: '/admin/database' },
        { icon: '💾', label: 'Cache', href: '/admin/cache' },
        { icon: '📄', label: 'Logs', href: '/admin/logs' },
        { icon: '🔐', label: 'Roles', href: '/admin/roles' },
        { icon: '🔑', label: 'Permissions', href: '/admin/permissions' },
        { icon: '💬', label: 'Feedback', href: '/admin/feedback' },
        { icon: '📋', label: 'Reports', href: '/admin/reports' },
        { icon: '📋', label: 'Changelog', href: '/admin/changelog' },
        { icon: '⏳', label: 'Waitlist', href: '/admin/waitlist' },
    ];

    return (
        <aside
            className={`bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0 transition-all ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                {!collapsed && <h2 className="font-bold text-white">Admin</h2>}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <nav className="p-2 overflow-y-auto h-[calc(100vh-65px)]">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${pathname === item.href
                                ? 'bg-indigo-600 text-white'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        {!collapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

export default AdminSidebar;
