// src/components/ui/copy-button.tsx
// Clipboard copy button component

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'both';
  successLabel?: string;
  onCopy?: (value: string) => void;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-9 w-9 text-base',
};

export function CopyButton({
  value,
  label = 'Copy',
  className,
  size = 'md',
  variant = 'icon',
  successLabel = 'Copied!',
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value, onCopy]);

  const icon = copied ? '✓' : '⧉';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? successLabel : label}
      title={copied ? successLabel : label}
      className={cn(
        'inline-flex items-center justify-center rounded-md border transition-all duration-150',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        copied
          ? 'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
          : 'border-border text-muted-foreground hover:text-foreground bg-background',
        variant === 'icon' ? sizeClasses[size] : 'px-3 gap-1.5',
        className
      )}
    >
      <span className={cn(variant === 'text' && 'hidden')}>{icon}</span>
      {(variant === 'text' || variant === 'both') && (
        <span className="text-sm font-medium">{copied ? successLabel : label}</span>
      )}
    </button>
  );
}

/** Inline copy code block with monospace value */
export function CopyCode({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-md bg-muted px-3 py-2', className)}>
      <code className="flex-1 text-sm font-mono truncate text-foreground">{code}</code>
      <CopyButton value={code} size="sm" />
    </div>
  );
}
