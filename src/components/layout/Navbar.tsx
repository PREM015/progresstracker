"use client";

import { useAuth}  from "@/hooks/useAuth";
import  Button  from "@/components/ui/Button";
import  Avatar  from "@/components/ui/Avatar";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Page Title (can be dynamic) */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Dashboard
            </h1>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.image || undefined}
                alt={user?.name || "User"}
                fallback={user?.name?.[0] || "U"}
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <Button variant="outline" size="sm" onClick={signOut}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}