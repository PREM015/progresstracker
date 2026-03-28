// src/components/ui/tag-input.tsx
// Tag input component for entering multiple tags

'use client';

import React, { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
  suggestions?: string[];
  separator?: string | string[];
  validate?: (tag: string) => boolean | string;
  onTagAdd?: (tag: string) => void;
  onTagRemove?: (tag: string) => void;
  allowDuplicates?: boolean;
}

export function TagInput({
  value: tags,
  onChange,
  placeholder = 'Type and press Enter or comma...',
  maxTags = 10,
  className,
  disabled,
  suggestions = [],
  separator = [',', 'Enter'],
  validate,
  onTagAdd,
  onTagRemove,
  allowDuplicates = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      inputValue.trim() &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      (allowDuplicates || !tags.includes(s))
  );

  const addTag = useCallback(
    (rawTag: string) => {
      const tag = rawTag.trim();
      if (!tag) return;
      if (!allowDuplicates && tags.includes(tag)) { setError('Tag already added'); return; }
      if (tags.length >= maxTags) { setError(`Max ${maxTags} tags`); return; }

      if (validate) {
        const result = validate(tag);
        if (result !== true) { setError(typeof result === 'string' ? result : 'Invalid tag'); return; }
      }

      setError(null);
      const newTags = [...tags, tag];
      onChange(newTags);
      onTagAdd?.(tag);
      setInputValue('');
    },
    [tags, maxTags, allowDuplicates, validate, onChange, onTagAdd]
  );

  const removeTag = useCallback(
    (tag: string) => {
      const newTags = tags.filter((t) => t !== tag);
      onChange(newTags);
      onTagRemove?.(tag);
    },
    [tags, onChange, onTagRemove]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const seps = Array.isArray(separator) ? separator : [separator];
    if (seps.includes(e.key) || seps.includes(',')) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(inputValue.replace(/,/g, ''));
      }
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-background min-h-[40px] w-full',
          'focus-within:ring-2 focus-within:ring-ring transition-shadow cursor-text',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium"
          >
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="hover:text-destructive transition-colors">
                ✕
              </button>
            )}
          </span>
        ))}
        {tags.length < maxTags && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue) addTag(inputValue); setShowSuggestions(false); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-border bg-popover shadow-md py-1 text-sm">
          {filteredSuggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-accent text-foreground"
                onMouseDown={(e) => { e.preventDefault(); addTag(s); setShowSuggestions(false); }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {maxTags && <p className="mt-1 text-xs text-muted-foreground">{tags.length}/{maxTags}</p>}
    </div>
  );
}
