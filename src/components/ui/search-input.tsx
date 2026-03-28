// src/components/ui/search-input.tsx
// Search input component with clear button and keyboard shortcut

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (value: string) => void;
  /** e.g. '⌘K' or 'Ctrl+K' to show in trailing badge */
  shortcut?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

const sizeClasses = {
  sm: 'h-8 text-sm px-8',
  md: 'h-9 text-sm px-9',
  lg: 'h-11 text-base px-10',
};

const iconSizeClasses = {
  sm: 'h-3.5 w-3.5 left-2.5',
  md: 'h-4 w-4 left-3',
  lg: 'h-5 w-5 left-3',
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  autoFocus,
  disabled,
  onFocus,
  onBlur,
  onSearch,
  shortcut,
  size = 'md',
  id,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') onSearch?.(value);
      if (e.key === 'Escape') {
        onChange('');
        inputRef.current?.blur();
      }
    },
    [value, onChange, onSearch]
  );

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      {/* Search icon */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute pointer-events-none text-muted-foreground',
          iconSizeClasses[size]
        )}
      >
        🔍
      </span>

      <input
        ref={inputRef}
        id={id}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'w-full rounded-lg border border-border bg-background text-foreground',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-shadow duration-150',
          sizeClasses[size]
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
          className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      )}

      {/* Keyboard shortcut badge */}
      {shortcut && !value && (
        <span className="absolute right-2 pointer-events-none">
          <kbd className="text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded px-1 py-0.5">
            {shortcut}
          </kbd>
        </span>
      )}
    </div>
  );
}
