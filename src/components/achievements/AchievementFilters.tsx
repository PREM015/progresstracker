/**
 * Component: AchievementFilters
 * Location: components/achievements/AchievementFilters.tsx
 * 
 * Description: Rich filtering UI for achievements with category and rarity selection
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { AchievementCategory, AchievementRarity, CATEGORY_CONFIG, RARITY_CONFIG } from '@/types/achievement';

export interface AchievementFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: AchievementCategory | 'all';
  onCategoryChange: (value: AchievementCategory | 'all') => void;
  selectedRarity: AchievementRarity | 'all';
  onRarityChange: (value: AchievementRarity | 'all') => void;
  showUnlockedOnly: boolean;
  onShowUnlockedChange: (value: boolean) => void;
  className?: string;
}

export const AchievementFilters: React.FC<AchievementFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedRarity,
  onRarityChange,
  showUnlockedOnly,
  onShowUnlockedChange,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[var(--primary)] text-[var(--text-muted)]">
          <Search className="w-5 h-5" />
        </div>
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search achievements by name or description..."
          className={cn(
            'w-full pl-12 pr-4 h-14 rounded-2xl border transition-all duration-300 outline-none font-medium',
            'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--foreground)]',
            'focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10',
            'placeholder:text-[var(--text-muted)]/50'
          )}
        />
      </div>

      {/* Main Filter Tags */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => onShowUnlockedChange(!showUnlockedOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-95',
            showUnlockedOnly
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
              : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Unlocked
        </button>

        <div className="h-6 w-px bg-[var(--card-border)] mx-1" />

        <div className="flex gap-2 p-1 bg-[var(--card-border)]/50 rounded-xl">
          {(['all', 'problems', 'streak', 'consistency', 'goals'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                'px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                selectedCategory === cat
                  ? 'bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Rarity & Detailed Category Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] shrink-0">Rarity:</span>
          {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((rarity) => {
            const config = rarity !== 'all' ? RARITY_CONFIG[rarity] : null;
            return (
              <button
                key={rarity}
                onClick={() => onRarityChange(rarity)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
                  selectedRarity === rarity
                    ? 'bg-[var(--foreground)] border-[var(--foreground)] text-[var(--card-bg)]'
                    : 'border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--foreground)]/50'
                )}
              >
                {config && <span>{config.emoji}</span>}
                {rarity}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium text-xs">
          <Filter className="w-4 h-4" />
          <span>Showing all achievements</span>
        </div>
      </div>
    </div>
  );
};

export default AchievementFilters;
