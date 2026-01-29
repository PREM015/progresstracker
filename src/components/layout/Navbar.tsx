// src/components/layout/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Settings, User, LogOut, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NavbarProps {
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    currentStreak: number;
  };
  unreadNotifications?: number;
  onThemeToggle?: () => void;
  theme?: 'light' | 'dark' | 'system';
}

export default function Navbar({ user, unreadNotifications = 0, onThemeToggle, theme = 'light' }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (showNotifications && user) {
      // eslint-disable-next-line react-hooks/immutability
      fetchNotifications();
    }
  }, [showNotifications, user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=5&unreadOnly=true');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              Progress Tracker
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search platforms, goals..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No new notifications
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/notifications"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name}
                </span>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    {user && user.currentStreak > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        🔥 {user.currentStreak} day streak
                      </p>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-red-600 dark:text-red-400 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}