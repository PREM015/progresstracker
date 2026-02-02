/**
 * Component: FileUpload
 * Location: components/ui/FileUpload.tsx
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { formatBytes } from '@/lib/utils';

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

export const FileUpload: React.FC<FileUploadProps> = ({
  accept, multiple = false, maxSize = 10 * 1024 * 1024, maxFiles = 5, onFilesChange, onError, disabled, className
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((newFiles: File[]): File[] => {
    const valid: File[] = [];
    for (const file of newFiles) {
      if (maxSize && file.size > maxSize) {
        onError?.(`File "${file.name}" exceeds ${formatBytes(maxSize)} limit`);
        continue;
      }
      if (!multiple && valid.length >= 1) break;
      if (multiple && files.length + valid.length >= maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        break;
      }
      valid.push(file);
    }
    return valid;
  }, [files.length, maxFiles, maxSize, multiple, onError]);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const validated = validateFiles(Array.from(newFiles));
    if (validated.length > 0) {
      const updatedFiles = multiple ? [...files, ...validated] : validated;
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    }
  }, [files, multiple, onFilesChange, validateFiles]);

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); !disabled && setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--card-border)] hover:border-[var(--primary)]/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <UploadIcon />
          <p className="text-sm font-medium">Drag & drop files here or click to browse</p>
          <p className="text-xs">Max size: {formatBytes(maxSize)}{multiple && ` • Max files: ${maxFiles}`}</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--sidebar-bg)]">
              <FileIcon />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(idx)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
