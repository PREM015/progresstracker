'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverEffect = true,
  glowColor,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={hoverEffect ? { scale: 1.02, y: -5 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/50 dark:bg-gray-800/30 backdrop-blur-md shadow-xl transition-all duration-300",
        className
      )}
      {...props as any}
    >
      {/* Optional Glow Halo */}
      {glowColor && (
        <div
          className="absolute -z-10 -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl transition-all duration-500 pointer-events-none"
          style={{ backgroundColor: glowColor }}
        />
      )}

      {/* Subtle interior glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

      {children}
    </motion.div>
  );
};
