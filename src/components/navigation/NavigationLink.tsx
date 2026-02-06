'use client';

import React from 'react';

interface NavigationLinkProps {
    href: string;
    label: string;
    icon?: string;
    active?: boolean;
    className?: string;
}

export const NavigationLink: React.FC<NavigationLinkProps> = ({
    href,
    label,
    icon,
    active = false,
    className = '',
}) => {
    return (
        <a
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${className}`}
        >
            {icon && <span className="text-xl">{icon}</span>}
            <span className="font-medium">{label}</span>
        </a>
    );
};

export default NavigationLink;
