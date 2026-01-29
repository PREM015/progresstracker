"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  RefreshCw,
  Layers,
  Menu,
  X,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";

/* ---------------- CONFIG ---------------- */

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Platforms", href: "/admin/platforms", icon: Layers },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Sync", href: "/admin/sync", icon: RefreshCw },
  { title: "Settings", href: "/admin/settings", icon: Settings },
] as const;

/* ---------------- LAYOUT ---------------- */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const [darkMode, setDarkMode] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("darkMode") === "true";
  });

  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  /* ---------------- AUTH GUARD ---------------- */

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }

    if (session?.user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  /* ---------------- THEME ---------------- */

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  /* ---------------- NOTIFICATIONS ---------------- */

  React.useEffect(() => {
    if (!session?.user) return;

    const load = async () => {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const json: { count: number } = await res.json();
        setUnreadCount(json.count);
      }
    };

    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [session]);

  /* ---------------- LOADING ---------------- */

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session?.user) return null;

  const user = session.user;
  const initial =
    user.name?.charAt(0).toUpperCase() ??
    user.email?.charAt(0).toUpperCase() ??
    "A";

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b dark:border-gray-700">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ href, title, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/admin" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                {title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="lg:pl-64">
        <header className="h-16 sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu />
          </button>

          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode((v) => !v)}>
              {darkMode ? <Sun /> : <Moon />}
            </button>

            <div className="relative">
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">
                  {initial}
                </div>
              )}
              <ChevronDown />
            </button>

            {profileOpen && (
              <div className="absolute right-4 top-16 w-48 bg-white dark:bg-gray-800 border rounded-lg shadow">
                <Link
                  href="/admin/profile"
                  className="flex gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="flex w-full gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
