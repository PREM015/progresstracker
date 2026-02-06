'use client';

import React, { useState } from 'react';

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface PlatformSearchProps {
  platforms: Platform[];
  onSelect: (platform: Platform) => void;
  className?: string;
}

export const PlatformSearch: React.FC<PlatformSearchProps> = ({
  platforms,
  onSelect,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredPlatforms = platforms.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(platforms.map(p => p.category)))];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platforms..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm ${selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        {filteredPlatforms.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No platforms found
          </div>
        ) : (
          filteredPlatforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onSelect(platform)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-2">{platform.icon}</div>
              <div className="font-semibold text-gray-900 text-sm">{platform.name}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default PlatformSearch;
