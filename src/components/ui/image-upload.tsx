// src/components/ui/image-upload.tsx
// Image upload component with preview and crop hint

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string; // current image URL for preview
  onChange?: (file: File | null) => void;
  onUpload?: (file: File) => Promise<string>;
  onUrlChange?: (url: string) => void;
  aspectRatio?: 'square' | 'wide' | 'portrait' | 'free';
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  shape?: 'rounded' | 'circle' | 'square';
}

const aspectClasses = {
  square: 'aspect-square',
  wide: 'aspect-video',
  portrait: 'aspect-[3/4]',
  free: '',
};

const shapeClasses = {
  rounded: 'rounded-xl',
  circle: 'rounded-full',
  square: 'rounded-none',
};

export function ImageUpload({
  value,
  onChange,
  onUpload,
  onUrlChange,
  aspectRatio = 'square',
  maxSizeMB = 5,
  accept = 'image/*',
  disabled,
  className,
  label = 'Upload image',
  shape = 'rounded',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > maxSizeMB * 1024 * 1024) { setError(`Image must be under ${maxSizeMB}MB`); return; }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange?.(file);

    if (onUpload) {
      setIsLoading(true);
      try {
        const url = await onUpload(file);
        setPreview(url);
        onUrlChange?.(url);
      } catch (e) {
        setError('Upload failed');
        setPreview(value ?? null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [maxSizeMB, onChange, onUpload, onUrlChange, value]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    onChange?.(null);
    onUrlChange?.('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !disabled && !isLoading && inputRef.current?.click()}
        className={cn(
          'relative overflow-hidden border-2 border-dashed cursor-pointer transition-all',
          aspectClasses[aspectRatio],
          shapeClasses[shape],
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled || isLoading ? 'opacity-50 cursor-not-allowed' : '',
          !preview && 'bg-muted/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {preview ? (
          <>
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-white text-sm font-medium">Change</span>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-2xl">🖼️</span>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">Max {maxSizeMB}MB</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {preview && !disabled && (
        <button type="button" onClick={clear} className="text-xs text-destructive hover:underline">
          Remove image
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
