"use client";

import React, { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceTime?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  onSearch,
  debounceTime = 300,
}) => {
  const [query, setQuery] = useState("");
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      onSearch(query);
    }, debounceTime);
    
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [debounceTime, onSearch, query]);

  return (
    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 w-full max-w-md mx-auto bg-white dark:bg-gray-900 shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition">
      
      {/* Search Icon */}
      <svg
        className="w-5 h-5 text-gray-400 mr-2 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx={11} cy={11} r={8} />
        <line x1={21} y1={21} x2={16.65} y2={16.65} />
      </svg>

      {/* Input */}
      <input
        className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Clear Button */}
      {query && (
        <button
          onClick={() => setQuery("")}
          className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <line x1={18} y1={6} x2={6} y2={18} />
            <line x1={6} y1={6} x2={18} y2={18} />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
