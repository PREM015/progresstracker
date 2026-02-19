'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlowBorderProps {
    children: React.ReactNode;
    className?: string;
    color?: string | string[];
    borderWidth?: number;
    duration?: number;
    borderRadius?: number;
}

export const GlowBorder: React.FC<GlowBorderProps> = ({
    children,
    className = '',
    color = ['#A07CFE', '#FE8FB5', '#FFBE7B'],
    borderWidth = 2,
    duration = 10,
    borderRadius = 12, // Default to 12px (rounded-xl)
}) => {
    const gradientColors = Array.isArray(color) ? color.join(', ') : color;

    return (
        <div
            className={cn(
                "relative bg-transparent transition-all",
                className
            )}
            style={{
                padding: borderWidth,
                borderRadius: borderRadius,
            }}
        >
            <div
                className="absolute inset-0 overflow-hidden rounded-[inherit]"
                style={{
                    filter: 'blur(10px)',
                    opacity: 0.5,
                }}
            >
                <div
                    className="absolute inset-[-100%] w-[300%] h-[300%] animate-spin-slow"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0 340deg, ${Array.isArray(color) ? color[0] : color} 360deg)`,
                        animationDuration: `${duration}s`,
                        left: '-100%',
                        top: '-100%',
                    }}
                />
            </div>

            {/* Actual border mask */}
            <div className="absolute inset-0 rounded-[inherit] overflow-hidden p-[1px]">
                <div
                    className="absolute inset-[-100%] w-[300%] h-[300%] animate-spin-slow"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0 340deg, white 360deg)`,
                        animationDuration: `${duration}s`,
                    }}
                />
            </div>

            <div className="relative h-full w-full rounded-[inherit] bg-background">
                {children}
            </div>
        </div>
    );
};
