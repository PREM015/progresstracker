// src/components/ui/combobox.tsx
// Searchable combobox/autocomplete component

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (query: string) => void;
  id?: string;
  required?: boolean;
  'aria-label'?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found',
  className,
  disabled,
  loading,
  onSearch,
  id,
  required,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        !o.disabled &&
        (o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
    );
  }, [options, query]);

  // Group by group field
  const grouped = useMemo(() => {
    const groups: Record<string, ComboboxOption[]> = {};
    for (const opt of filtered) {
      const g = opt.group ?? '';
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    }
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 10);
    else setQuery('');
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((opt: ComboboxOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-required={required}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring transition-shadow',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'ring-2 ring-ring'
        )}
      >
        <span className={cn(selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected ? (
            <span className="flex items-center gap-2">{selected.icon}{selected.label}</span>
          ) : placeholder}
        </span>
        <span className="text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); onSearch?.(e.target.value); }}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <li className="flex justify-center py-4 text-sm text-muted-foreground">Loading...</li>
            ) : filtered.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</li>
            ) : (
              Object.entries(grouped).map(([group, opts]) => (
                <React.Fragment key={group}>
                  {group && (
                    <li className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group}
                    </li>
                  )}
                  {opts.map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={opt.value === value}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors',
                        opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent',
                        opt.value === value && 'bg-primary/10 text-primary font-medium'
                      )}
                    >
                      {opt.icon}
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">{opt.label}</span>
                        {opt.description && <span className="text-xs text-muted-foreground">{opt.description}</span>}
                      </span>
                      {opt.value === value && <span className="text-primary text-xs">✓</span>}
                    </li>
                  ))}
                </React.Fragment>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
