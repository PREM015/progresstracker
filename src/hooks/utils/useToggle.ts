// ============================================================================
// FILE: src/hooks/utils/useToggle.ts
// PURPOSE: Boolean toggle state with convenient methods
// ============================================================================

'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseToggleReturn {
  /** Current value */
  value: boolean;
  /** Toggle the value */
  toggle: () => void;
  /** Set to true */
  setTrue: () => void;
  /** Set to false */
  setFalse: () => void;
  /** Set to specific value */
  setValue: (value: boolean) => void;
}

/**
 * Boolean toggle state with convenient methods
 * @param initialValue - Initial boolean value (default: false)
 */
export function useToggle(initialValue: boolean = false): UseToggleReturn {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return useMemo(
    () => ({
      value,
      toggle,
      setTrue,
      setFalse,
      setValue,
    }),
    [value, toggle, setTrue, setFalse]
  );
}

/**
 * Convenience hook for modal/dialog state
 * @param initialOpen - Initial open state
 */
export function useDisclosure(initialOpen: boolean = false) {
  const { value: isOpen, setTrue: open, setFalse: close, toggle } = useToggle(initialOpen);

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      onOpenChange: (open: boolean) => (open ? open : close),
    }),
    [isOpen, open, close, toggle]
  );
}

export default useToggle;