// src/components/ui/multi-select.tsx
// Multi-select dropdown component

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ComboboxOption } from './combobox';

interface MultiSelectProps {
  options: ComboboxOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxSelected?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function MultiSelect({
  options,
  value: selected,
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results',
  maxSelected,
  className,
  disabled,
  id,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 10);
    else setQuery('');
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = useCallback((val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else if (!maxSelected || selected.length < maxSelected) {
      onChange([...selected, val]);
    }
  }, [selected, onChange, maxSelected]);

  const removeTag = useCallback((val: string) => {
    onChange(selected.filter((v) => v !== val));
  }, [selected, onChange]);

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        id={id}
        role="button"
        aria-expanded={isOpen}
        aria-multiselectable="true"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={cn(
          'flex flex-wrap gap-1 min-h-[38px] items-center w-full rounded-lg border border-border bg-background px-2 py-1.5 cursor-pointer',
          'focus-within:ring-2 focus-within:ring-ring transition-shadow text-sm',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {selectedOptions.length === 0 && (
          <span className="text-muted-foreground px-1">{placeholder}</span>
        )}
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium"
          >
            {opt.icon}{opt.label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(opt.value); }}
                aria-label={`Remove ${opt.label}`}
                className="hover:text-destructive transition-colors ml-0.5"
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {maxSelected && (
          <span className="ml-auto text-xs text-muted-foreground">{selected.length}/{maxSelected}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</li>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.value);
                const isMax = !!maxSelected && selected.length >= maxSelected && !isSelected;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !isMax && toggle(opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors',
                      isMax ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent',
                      isSelected && 'bg-primary/10 text-primary'
                    )}
                  >
                    <span className={cn('h-4 w-4 rounded border flex items-center justify-center text-[10px]', isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border')}>
                      {isSelected && '✓'}
                    </span>
                    {opt.icon}
                    <span className="flex-1">{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
