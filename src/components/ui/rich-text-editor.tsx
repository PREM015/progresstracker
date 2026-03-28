// src/components/ui/rich-text-editor.tsx
// Simple rich-text editor using contentEditable with toolbar

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface ToolbarButton {
  command: string;
  arg?: string;
  label: string;
  icon: string;
  isBlock?: boolean;
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  toolbar?: ('basic' | 'full');
}

// =============================================================================
// TOOLBAR CONFIGS
// =============================================================================

const basicButtons: ToolbarButton[] = [
  { command: 'bold', label: 'Bold', icon: 'B' },
  { command: 'italic', label: 'Italic', icon: 'I' },
  { command: 'underline', label: 'Underline', icon: 'U' },
];

const fullButtons: ToolbarButton[] = [
  ...basicButtons,
  { command: 'strikethrough', label: 'Strikethrough', icon: 'S' },
  { command: 'insertOrderedList', label: 'Ordered list', icon: '1.' },
  { command: 'insertUnorderedList', label: 'Unordered list', icon: '•' },
  { command: 'formatBlock', arg: 'blockquote', label: 'Quote', icon: '"' },
  { command: 'removeFormat', label: 'Remove formatting', icon: 'T/' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write something...',
  minHeight = 120,
  maxHeight = 400,
  className,
  disabled,
  id,
  'aria-label': ariaLabel,
  toolbar = 'full',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isInitialized = useRef(false);

  // Set initial HTML once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value;
      isInitialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const buttons = toolbar === 'full' ? fullButtons : basicButtons;

  return (
    <div className={cn('rounded-xl border border-border bg-background', isFocused && 'ring-2 ring-ring', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5 rounded-t-xl">
        {buttons.map((btn) => (
          <button
            key={btn.command + (btn.arg ?? '')}
            type="button"
            title={btn.label}
            aria-label={btn.label}
            disabled={disabled}
            onClick={() => execCommand(btn.command, btn.arg)}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-foreground',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {btn.icon}
          </button>
        ))}

        {toolbar === 'full' && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            {/* Heading selector */}
            {(['h1','h2','h3'] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                title={`Heading ${tag.replace('h','')}`}
                onClick={() => execCommand('formatBlock', tag)}
                disabled={disabled}
                className="rounded px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        id={id}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label={ariaLabel ?? placeholder}
        aria-placeholder={placeholder}
        aria-multiline="true"
        role="textbox"
        style={{ minHeight, maxHeight, overflowY: 'auto' }}
        data-placeholder={placeholder}
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none px-4 py-3 outline-none text-foreground text-sm leading-relaxed',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
    </div>
  );
}
