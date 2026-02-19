'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, Bell, Lock, CreditCard, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
}

const SECTIONS: SettingsSection[] = [
    { id: 'profile', title: 'Profile', description: 'Manage your personal information', icon: User, href: '/settings/profile' },
    { id: 'account', title: 'Account', description: 'Security and preferences', icon: Shield, href: '/settings/account' },
    { id: 'notifications', title: 'Notifications', description: 'Email and push settings', icon: Bell, href: '/settings/notifications' },
    { id: 'privacy', title: 'Privacy', description: 'Data and visibility controls', icon: Lock, href: '/settings/privacy' },
    { id: 'billing', title: 'Billing', description: 'Subscription and payments', icon: CreditCard, href: '/settings/billing' },
    { id: 'integrations', title: 'Integrations', description: 'Connected platforms', icon: LinkIcon, href: '/settings/integrations' },
    { id: 'danger', title: 'Danger Zone', description: 'Delete account', icon: AlertTriangle, href: '/settings/danger-zone' },
];

export const SettingsNavigation = ({ className }: { className?: string }) => {
    const pathname = usePathname();

    return (
        <GlassCard className={cn("h-fit p-4", className)}>
            <h3 className="text-lg font-bold text-gray-100 mb-4 px-2">Settings</h3>
            <nav className="space-y-1">
                {SECTIONS.map(section => {
                    const isActive = pathname === section.href;
                    return (
                        <Link
                            key={section.id}
                            href={section.href}
                            className={cn(
                                "flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all",
                                isActive
                                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                            )}
                        >
                            <section.icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-gray-500")} />
                            <div>
                                <div className="font-semibold text-sm">{section.title}</div>
                                <div className="text-xs opacity-75 hidden xl:block">{section.description}</div>
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </GlassCard>
    );
};

export default SettingsNavigation;
