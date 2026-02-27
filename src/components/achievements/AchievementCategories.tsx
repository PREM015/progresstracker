// src/components/achievements/AchievementCategories.tsx
'use client';

import { memo, useState, useCallback } from 'react';
import { CATEGORY_CONFIG, type AchievementCategory } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface CategoryStats {
  total: number;
  unlocked: number;
  points: number;
}

interface AchievementCategoriesProps {
  stats?: Record<AchievementCategory, CategoryStats>;
  selectedCategory?: AchievementCategory | null;
  onSelectCategory?: (category: AchievementCategory | null) => void;
  layout?: 'grid' | 'horizontal' | 'compact';
  showStats?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementCategories = memo(function AchievementCategories({
  stats,
  selectedCategory,
  onSelectCategory,
  layout = 'grid',
  showStats = true,
  className = '',
}: AchievementCategoriesProps) {
  // Client component is always mounted → no need for useEffect + setState
  const [mounted] = useState(true);

  const categories = Object.entries(CATEGORY_CONFIG) as [
    AchievementCategory,
    typeof CATEGORY_CONFIG[AchievementCategory]
  ][];

  const handleSelect = useCallback(
    (category: AchievementCategory) => {
      if (onSelectCategory) {
        onSelectCategory(selectedCategory === category ? null : category);
      }
    },
    [onSelectCategory, selectedCategory]
  );

  const getCompletionPercent = (category: AchievementCategory): number => {
    if (!stats?.[category]) return 0;
    const { total, unlocked } = stats[category];
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  };

  const layoutClasses = {
    grid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3',
    horizontal: 'flex flex-wrap gap-2',
    compact: 'flex flex-wrap gap-1.5',
  };

  if (!mounted) {
    return <CategoriesSkeleton layout={layout} />;
  }

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {/* All Categories Option */}
      <button
        onClick={() => onSelectCategory?.(null)}
        className={`
          ${layout === 'grid' ? 'p-4 rounded-xl' : 'px-3 py-1.5 rounded-lg'}
          border-2 transition-all duration-200
          ${
            !selectedCategory
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }
        `}
      >
        <span className={layout === 'grid' ? 'text-2xl' : 'text-base'}>🏆</span>
        <span
          className={`${
            layout === 'grid' ? 'block mt-1 text-sm font-medium' : 'ml-2 text-sm'
          }`}
        >
          All
        </span>
      </button>

      {categories.map(([key, config]) => {
        const isSelected = selectedCategory === key;
        const completion = getCompletionPercent(key);
        const categoryStats = stats?.[key];

        return (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`
              relative overflow-hidden text-left transition-all duration-200
              ${layout === 'grid' ? 'p-4 rounded-xl' : 'px-3 py-1.5 rounded-lg'}
              border-2
              ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            {/* Progress Background */}
            {layout === 'grid' && showStats && (
              <div
                className="absolute inset-0 bg-linear-to-r from-indigo-100/50 to-transparent transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            )}

            <div className="relative">
              {layout === 'grid' ? (
                <>
                  <span className="text-2xl">{config.emoji}</span>
                  <div className="mt-2">
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      {config.label}
                    </span>
                    {showStats && categoryStats && (
                      <div className="mt-1 text-xs text-gray-500">
                        {categoryStats.unlocked}/{categoryStats.total} unlocked
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>{config.emoji}</span>
                  <span
                    className={`text-sm ${
                      isSelected ? 'font-medium text-indigo-700' : 'text-gray-600'
                    }`}
                  >
                    {config.label}
                  </span>
                  {showStats && categoryStats && layout === 'horizontal' && (
                    <span className="text-xs text-gray-400">
                      ({categoryStats.unlocked})
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
});

// =============================================================================
// SKELETON
// =============================================================================

function CategoriesSkeleton({ layout }: { layout: string }) {
  const count = layout === 'grid' ? 12 : 8;
  const itemClass =
    layout === 'grid' ? 'h-24 rounded-xl' : 'h-8 w-24 rounded-lg';

  return (
    <div
      className={
        layout === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
          : 'flex flex-wrap gap-2'
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${itemClass} bg-gray-100 animate-pulse`} />
      ))}
    </div>
  );
}

export default AchievementCategories;
