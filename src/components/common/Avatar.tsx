// ============================================================================
// FILE: src/components/common/Avatar.tsx
// PURPOSE: User avatar component with fallback and status indicator
// ============================================================================

'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

// PROPS INTERFACE:
interface AvatarProps {
    src?: string | null;
    alt?: string;
    fallback?: string;        // Initials or icon
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'away' | 'busy';
    className?: string;
}

// SIZE MAPPINGS:
const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
};

// STATUS INDICATOR COLORS:
const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
};

// COMPONENT:
export function Avatar({ src, alt, fallback, size = 'md', status, className }: AvatarProps) {
    // Generate initials from alt text if no fallback
    const initials = React.useMemo(() => {
        if (fallback) return fallback;
        if (!alt) return '?';
        return alt
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [alt, fallback]);

    return (
        <div className="relative inline-block">
            <AvatarPrimitive.Root
                className={cn(
                    'relative flex shrink-0 overflow-hidden rounded-full',
                    sizes[size],
                    className
                )}
            >
                <AvatarPrimitive.Image
                    src={src || undefined}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                />
                <AvatarPrimitive.Fallback
                    className={cn(
                        'flex h-full w-full items-center justify-center rounded-full',
                        'bg-muted text-muted-foreground font-medium'
                    )}
                    delayMs={600}
                >
                    {initials}
                </AvatarPrimitive.Fallback>
            </AvatarPrimitive.Root>

            {/* Status indicator */}
            {status && (
                <span
                    className={cn(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
                        size === 'xs' ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5',
                        statusColors[status]
                    )}
                />
            )}
        </div>
    );
}

// AVATAR GROUP (for showing multiple avatars):
interface AvatarGroupProps {
    avatars: Array<{ src?: string; alt: string }>;
    max?: number;
    size?: AvatarProps['size'];
}

export function AvatarGroup({ avatars, max = 3, size = 'sm' }: AvatarGroupProps) {
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    return (
        <div className="flex -space-x-2">
            {visible.map((avatar, i) => (
                <Avatar key={i} {...avatar} size={size} className="ring-2 ring-background" />
            ))}
            {remaining > 0 && (
                <div className={cn(sizes[size], 'flex items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background')}>
                    +{remaining}
                </div>
            )}
        </div>
    );
}
