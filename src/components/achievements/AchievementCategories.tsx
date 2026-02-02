/**
 * Component: AchievementCategories
 * Location: components/achievements/AchievementCategories.tsx
 * 
 * Description: Grid display of achievement categories with stats and completion trackers
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { AchievementCategory, CATEGORY_CONFIG } from '@/types/achievement';

export interface CategoryStats {
  id: AchievementCategory;
  total: number;
  unlocked: number;
  points: number;
}

export interface AchievementCategoriesProps {
  stats: CategoryStats[];
  onCategorySelect?: (id: AchievementCategory) => void;
  className?: string;
}

export const AchievementCategories: React.FC<AchievementCategoriesProps> = ({
  stats,
  onCategorySelect,
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {stats.map((cat, index) => {
        const config = CATEGORY_CONFIG[cat.id] || CATEGORY_CONFIG.special;
        const percentage = cat.total > 0 ? (cat.unlocked / cat.total) * 100 : 0;

        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onCategorySelect?.(cat.id)}
            className={cn(
              'group relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 cursor-pointer',
              'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--primary)]/50'
            )}
          >
            {/* Background Icon Watermark */}
            <div className="absolute -bottom-4 -right-4 text-9xl transform -rotate-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
              {config.emoji}
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="p-3 rounded-2xl shadow-lg shadow-[var(--primary)]/5"
                  style={{ backgroundColor: `${config.color}15`, color: config.color }}
                >
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[var(--foreground)]">{cat.unlocked}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Unlocked</p>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">
                  {config.label}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {cat.points} Points Earned
                </p>
              </div>

              <div className="mt-auto space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <span>Completion</span>
                    <span className="text-[var(--primary)]">{Math.round(percentage)}%</span>
                  </div>
                  <Progress value={percentage} size="xs" className="h-1.5" />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    {cat.total - cat.unlocked} items remaining
                  </span>
                  <div className="flex items-center gap-1 text-[var(--primary)] font-black text-xs uppercase tracking-widest">
                    Explore
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AchievementCategories;
