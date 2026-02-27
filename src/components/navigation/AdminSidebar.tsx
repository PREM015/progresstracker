'use client';

import React from 'react';

interface AdminSidebarProps {
  activePage?: string;
  className?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activePage,
  className = '',
}) => {
  const sections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin', icon: '📊' },
        { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Users', href: '/admin/users', icon: '👥' },
        { label: 'Content', href: '/admin/blog', icon: '📝' },
        { label: 'Platforms', href: '/admin/platforms', icon: '🔗' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/admin/system-settings', icon: '⚙️' },
        { label: 'Logs', href: '/admin/logs', icon: '📜' },
      ],
    },
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 w-64 h-full ${className}`}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Admin</h2>

        <nav className="space-y-6">
          {sections.map(section => (
            <div key={section.title}>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activePage === item.href
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
