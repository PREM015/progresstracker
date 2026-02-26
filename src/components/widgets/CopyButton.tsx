/**
 * Component: CopyButton
 * Location: components/widgets/CopyButton.tsx
 * 
 * Description: Button to copy text to clipboard with feedback
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/context/ToastContext';

export interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  showIcon?: boolean;
  showToast?: boolean;
  onCopy?: (text: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  successMessage = 'Copied to clipboard!',
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  showToast = true,
  onCopy,
  onError,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text);

      if (showToast) {
        toast({
          title: successMessage,
          variant: 'success',
        });
      }

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');
      onError?.(error);

      if (showToast) {
        toast({
          title: 'Failed to copy',
          description: error.message,
          variant: 'error',
        });
      }
    }
  }, [text, successMessage, showToast, toast, onCopy, onError]);

  const buttonContent = size === 'icon' ? (
    copied ? <CheckIcon /> : <CopyIcon />
  ) : (
    <>
      {showIcon && (copied ? <CheckIcon /> : <CopyIcon />)}
      {copied ? 'Copied!' : label}
    </>
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(
        copied && 'text-emerald-500 border-emerald-500',
        className
      )}
    >
      {buttonContent}
    </Button>
  );
};

// Utility function for direct clipboard access
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default CopyButton;
