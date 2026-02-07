// ============================================================================
// FILE: src/hooks/utils/useInfiniteScroll.ts
// PURPOSE: Infinite scroll detection with intersection observer
// ============================================================================

'use client';

import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

interface UseInfiniteScrollOptions {
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Root margin for earlier triggering */
  rootMargin?: string;
  /** Whether to enable the observer */
  enabled?: boolean;
  /** Callback when sentinel is visible */
  onLoadMore?: () => void;
}

interface UseInfiniteScrollReturn<T extends HTMLElement> {
  /** Ref to attach to sentinel element */
  sentinelRef: RefObject<T | null>;
  /** Whether sentinel is currently visible */
  isIntersecting: boolean;
  /** Reset the intersection state */
  reset: () => void;
}

/**
 * Infinite scroll with Intersection Observer
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    enabled = true,
    onLoadMore,
  } = options;

  const sentinelRef = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const reset = useCallback(() => {
    setIsIntersecting(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && onLoadMore) {
          onLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, rootMargin, onLoadMore]);

  return { sentinelRef, isIntersecting, reset };
}

/**
 * Simpler version that just returns if element is in view
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: Omit<UseInfiniteScrollOptions, 'onLoadMore'> = {}
): { ref: RefObject<T | null>; inView: boolean } {
  const { sentinelRef, isIntersecting } = useInfiniteScroll<T>(options);
  return { ref: sentinelRef, inView: isIntersecting };
}

/**
 * Hook for lazy loading elements
 */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: Omit<UseInfiniteScrollOptions, 'onLoadMore'> = {}
): { ref: RefObject<T | null>; hasLoaded: boolean } {
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleLoadMore = useCallback(() => {
    setHasLoaded(true);
  }, []);

  const { sentinelRef } = useInfiniteScroll<T>({
    ...options,
    onLoadMore: handleLoadMore,
    enabled: options.enabled !== false && !hasLoaded,
  });

  return { ref: sentinelRef, hasLoaded };
}

export default useInfiniteScroll;