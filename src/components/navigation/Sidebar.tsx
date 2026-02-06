'use client';

import React from 'react';

interface SidebarProps {
  activePage?: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  className = '',
}) => {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Tracker', href: '/tracker', icon: '📊' },
    { label: 'Goals', href: '/goals', icon: '🎯' },
    { label: 'Analytics', href: '/analytics', icon: '📈' },
    { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 w-64 h-full ${className}`}>
      <div className="p-6">
        <div className="text-2xl font-bold mb-8 text-indigo-600">Progress Tracker</div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activePage === item.href
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
