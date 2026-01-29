import React from "react";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-amber-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Page not found
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The admin page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link
            href="/admin"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Admin Dashboard
          </Link>
          
          <Link
            href="/dashboard"
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Main Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
