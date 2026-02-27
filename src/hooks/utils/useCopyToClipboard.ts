// ============================================================================
// FILE: src/hooks/utils/useCopyToClipboard.ts
// PURPOSE: Copy text to clipboard with feedback
// ============================================================================

'use client';

import { useState, useCallback } from 'react';

interface UseCopyToClipboardReturn {
  /** The copied text (null if nothing copied yet) */
  copiedText: string | null;
  /** Whether the copy was successful */
  isCopied: boolean;
  /** Copy function */
  copy: (text: string) => Promise<boolean>;
  /** Reset the copied state */
  reset: () => void;
}

/**
 * Copy text to clipboard with status tracking
 * @param resetDelay - Auto-reset delay in ms (default: 2000, 0 to disable)
 */
export function useCopyToClipboard(resetDelay: number = 2000): UseCopyToClipboardReturn {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const reset = useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard API not available');
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopiedText(text);
          setIsCopied(true);
          
          if (resetDelay > 0) {
            setTimeout(reset, resetDelay);
          }
          
          return true;
        }
        
        return false;
      } catch {
        console.error('Fallback copy failed');
        return false;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setIsCopied(true);
      
      if (resetDelay > 0) {
        setTimeout(reset, resetDelay);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopiedText(null);
      setIsCopied(false);
      return false;
    }
  }, [resetDelay, reset]);

  return { copiedText, isCopied, copy, reset };
}

export default useCopyToClipboard;