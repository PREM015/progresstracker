'use client';

import React, { useState } from 'react';

interface HelpSearchProps {
  className?: string;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate search results
    setResults([
      'How to connect a platform',
      'Troubleshooting sync issues',
      'Understanding analytics',
    ]);
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Search Help Articles</h3>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            🔍 Search
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold mb-3">Results</h4>
          {results.map((result, idx) => (
            <a
              key={idx}
              href="#"
              className="block p-3 border rounded-lg hover:bg-gray-50"
            >
              {result}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpSearch;
