'use client';

import { useState } from 'react';
import Link from 'next/link';

export function AdminHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin" className="text-xl font-bold text-white">
                            Admin Panel
                        </Link>

                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/admin/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/admin/users" className="text-zinc-400 hover:text-white transition-colors">
                                Users
                            </Link>
                            <Link href="/admin/platforms" className="text-zinc-400 hover:text-white transition-colors">
                                Platforms
                            </Link>
                            <Link href="/admin/feature-flags" className="text-zinc-400 hover:text-white transition-colors">
                                Features
                            </Link>
                            <Link href="/admin/audit-logs" className="text-zinc-400 hover:text-white transition-colors">
                                Audit Logs
                            </Link>
                            <Link href="/admin/system-settings" className="text-zinc-400 hover:text-white transition-colors">
                                Settings
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                            Back to App
                        </Link>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-zinc-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <nav className="md:hidden mt-4 pt-4 border-t border-zinc-800">
                        <div className="flex flex-col gap-3">
                            <Link href="/admin/dashboard" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Dashboard
                            </Link>
                            <Link href="/admin/users" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Users
                            </Link>
                            <Link href="/admin/platforms" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Platforms
                            </Link>
                            <Link href="/admin/feature-flags" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Features
                            </Link>
                            <Link href="/admin/audit-logs" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Audit Logs
                            </Link>
                            <Link href="/admin/system-settings" className="text-zinc-400 hover:text-white transition-colors py-2">
                                Settings
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}

export default AdminHeader;
