// src/components/ui/file-upload.tsx
// File upload component with drag & drop support

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
  url?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  maxFiles?: number;
  onFilesChange?: (files: UploadedFile[]) => void;
  onUpload?: (files: File[]) => Promise<string[]>;
  disabled?: boolean;
  className?: string;
  hint?: string;
  label?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  accept = '*/*',
  multiple = false,
  maxSizeMB = 10,
  maxFiles = 5,
  onFilesChange,
  onUpload,
  disabled,
  className,
  hint,
  label = 'Choose files',
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (raw: FileList | File[]) => {
    const files = Array.from(raw);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: file.size > maxSizeBytes ? 'error' : 'pending',
      error: file.size > maxSizeBytes ? `Exceeds ${maxSizeMB}MB limit` : undefined,
    }));

    const updated = multiple
      ? [...uploadedFiles, ...newFiles].slice(0, maxFiles)
      : newFiles.slice(0, 1);

    setUploadedFiles(updated);
    onFilesChange?.(updated);

    if (onUpload) {
      const valid = updated.filter((f) => f.status === 'pending').map((f) => f.file);
      if (valid.length) {
        const uploading = updated.map((f) =>
          f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
        );
        setUploadedFiles(uploading);
        try {
          const urls = await onUpload(valid);
          const done = uploading.map((f, i) =>
            f.status === 'uploading' ? { ...f, status: 'done' as const, url: urls[i] } : f
          );
          setUploadedFiles(done);
          onFilesChange?.(done);
        } catch {
          const errored = uploading.map((f) =>
            f.status === 'uploading' ? { ...f, status: 'error' as const, error: 'Upload failed' } : f
          );
          setUploadedFiles(errored);
          onFilesChange?.(errored);
        }
      }
    }
  }, [uploadedFiles, multiple, maxFiles, maxSizeMB, onFilesChange, onUpload]);

  const removeFile = useCallback((id: string) => {
    const updated = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(updated);
    onFilesChange?.(updated);
  }, [uploadedFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {hint ?? `Drag & drop or click • Max ${maxSizeMB}MB${multiple ? ` • Up to ${maxFiles} files` : ''}`}
        </p>
        {accept !== '*/*' && (
          <p className="text-xs text-muted-foreground mt-0.5">{accept}</p>
        )}
      </div>

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm">
              {f.preview ? (
                <img src={f.preview} alt={f.file.name} className="h-8 w-8 rounded object-cover shrink-0" />
              ) : (
                <span className="text-lg shrink-0">📄</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
              </div>
              {f.status === 'uploading' && <span className="text-xs text-blue-500 animate-pulse">Uploading...</span>}
              {f.status === 'done' && <span className="text-xs text-emerald-500">✓</span>}
              {f.status === 'error' && <span className="text-xs text-destructive" title={f.error}>✕</span>}
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                aria-label={`Remove ${f.file.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
