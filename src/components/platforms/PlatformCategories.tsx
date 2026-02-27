'use client';

import React from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
  platformCount: number;
  connectedCount: number;
}

interface PlatformCategoriesProps {
  onSelectCategory: (categoryId: string) => void;
  selectedCategory?: string;
  className?: string;
}

const CATEGORIES: Category[] = [
  { id: 'coding', name: 'Coding Platforms', icon: '💻', platformCount: 8, connectedCount: 0 },
  { id: 'productivity', name: 'Productivity', icon: '✅', platformCount: 5, connectedCount: 0 },
  { id: 'fitness', name: 'Fitness & Health', icon: '💪', platformCount: 6, connectedCount: 0 },
  { id: 'learning', name: 'Learning', icon: '📚', platformCount: 7, connectedCount: 0 },
  { id: 'social', name: 'Social Media', icon: '📱', platformCount: 4, connectedCount: 0 },
  { id: 'finance', name: 'Finance', icon: '💰', platformCount: 3, connectedCount: 0 },
];

export const PlatformCategories: React.FC<PlatformCategoriesProps> = ({
  onSelectCategory,
  selectedCategory,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      {CATEGORIES.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${selectedCategory === category.id
              ? 'border-indigo-600 bg-indigo-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-indigo-300'
            }`}
        >
          <div className="text-4xl mb-3">{category.icon}</div>
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">{category.name}</h3>
          <div className="text-xs text-gray-500">
            {category.connectedCount}/{category.platformCount} connected
          </div>
        </button>
      ))}
    </div>
  );
};

export default PlatformCategories;
