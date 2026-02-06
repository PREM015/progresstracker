'use client';

import React from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Tracker', href: '/tracker', icon: '📊' },
    { label: 'Goals', href: '/goals', icon: '🎯' },
    { label: 'Analytics', href: '/analytics', icon: '📈' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Menu</h2>
            <button onClick={onClose} className="text-2xl hover:bg-gray-100 rounded-lg p-2">×</button>
          </div>

          <nav className="space-y-2">
            {menuItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
