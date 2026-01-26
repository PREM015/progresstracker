"use client";

import React, { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search...",
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(false);

  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleClear = useCallback(() => {
    setValue("");
    onSearch?.("");
  }, [onSearch]);

  return (
    <div className={clsx("relative w-full", className)}>
      <div
        className={clsx(
          "relative flex items-center transition-all duration-200",
          "border rounded-lg px-3 py-2",
          isActive
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-gray-900"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
        )}
      >
        <Search className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          placeholder={placeholder}
          className={clsx(
            "ml-2 flex-1 bg-transparent outline-none text-sm",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "text-gray-900 dark:text-gray-100"
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className="ml-2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
