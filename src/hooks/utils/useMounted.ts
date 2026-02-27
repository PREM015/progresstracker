// ============================================================================
// FILE: src/hooks/utils/useMounted.ts
// PURPOSE: Track component mount state for SSR safety
// ============================================================================

'use client';

import {  useEffect, useCallback, useRef, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => { };
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Track if component is mounted (for SSR safety)
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

/**
 * Run effect only after mount (skip SSR)
 * @param effect - Effect to run after mount
 * @param deps - Dependencies array
 */
export function useEffectOnce(effect: () => void | (() => void)): void {
  const isMounted = useMounted();

  useEffect(() => {
    if (isMounted) {
      return effect();
    }
  }, [isMounted, effect]);
}

/**
 * Get a function that checks if component is still mounted
 * Useful for async operations
 */
export function useIsMountedRef(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Run callback only if component is mounted
 * Prevents state updates on unmounted components
 */
export function useSafeCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const getIsMounted = useIsMountedRef();

  const safeCallback = useCallback(
    (...args: Parameters<T>) => {
      if (getIsMounted()) {
        return callback(...args);
      }
    },
    [callback, getIsMounted]
  );

  return safeCallback as unknown as T;
}

export default useMounted;