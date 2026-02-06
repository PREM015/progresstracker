'use client';

import React, { useState } from 'react';

interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: string;
}

interface SettingsNavigationProps {
    currentSection: string;
    onSectionChange: (sectionId: string) => void;
    className?: string;
}

const SECTIONS: SettingsSection[] = [
    { id: 'profile', title: 'Profile', description: 'Manage your personal information', icon: '👤' },
    { id: 'account', title: 'Account', description: 'Security and preferences', icon: '🔐' },
    { id: 'notifications', title: 'Notifications', description: 'Email and push settings', icon: '🔔' },
    { id: 'privacy', title: 'Privacy', description: 'Data and visibility controls', icon: '🔒' },
    { id: 'billing', title: 'Billing', description: 'Subscription and payments', icon: '💳' },
    { id: 'integrations', title: 'Integrations', description: 'Connected platforms', icon: '🔗' },
];

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
    currentSection,
    onSectionChange,
    className = '',
}) => {
    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">Settings</h3>
            <nav className="space-y-1">
                {SECTIONS.map(section => (
                    <button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${currentSection === section.id
                                ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{section.icon}</span>
                            <div>
                                <div className="font-semibold">{section.title}</div>
                                <div className="text-xs opacity-75">{section.description}</div>
                            </div>
                        </div>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default SettingsNavigation;
