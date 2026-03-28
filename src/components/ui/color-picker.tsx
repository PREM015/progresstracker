// src/components/ui/color-picker.tsx
// Color picker component (hex)

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Common preset palette
const PRESETS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#8b5cf6','#ec4899','#6b7280','#0f172a',
  '#ffffff','#f8fafc',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
  showPresets?: boolean;
  showInput?: boolean;
  id?: string;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function ColorPicker({
  value,
  onChange,
  className,
  disabled,
  showPresets = true,
  showInput = true,
  id,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    if (isValidHex(val)) onChange(val);
  }, [onChange]);

  const handleNative = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setInputVal(e.target.value);
  }, [onChange]);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        aria-label={`Color: ${value}`}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-9 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring transition-shadow',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="h-5 w-5 rounded-md border border-border shadow-sm" style={{ backgroundColor: value }} />
        <span className="font-mono text-xs">{value.toUpperCase()}</span>
        <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 z-20 mt-1.5 rounded-xl border border-border bg-popover shadow-xl p-3 w-52">
          {/* Native colour picker */}
          <div className="flex justify-center mb-3">
            <input
              type="color"
              value={value}
              onChange={handleNative}
              className="h-20 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
          </div>

          {/* Presets */}
          {showPresets && (
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { onChange(preset); setInputVal(preset); }}
                  aria-label={preset}
                  className={cn(
                    'h-6 w-6 rounded-md border transition-transform hover:scale-110',
                    value === preset ? 'ring-2 ring-ring ring-offset-1' : 'border-border'
                  )}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          )}

          {/* Hex input */}
          {showInput && (
            <input
              type="text"
              value={inputVal}
              onChange={handleInput}
              maxLength={7}
              placeholder="#000000"
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>
      )}
    </div>
  );
}
