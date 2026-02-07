// ============================================================================
// FILE: src/hooks/utils/index.ts
// PURPOSE: Export all utility hooks
// ============================================================================

// Debounce
export { useDebounce, useDebouncedCallback } from './useDebounce';

// Storage
export { useLocalStorage } from './useLocalStorage';

// Media queries
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  usePrefersDarkMode,
  usePrefersReducedMotion,
} from './useMediaQuery';

// Clipboard
export { useCopyToClipboard } from './useCopyToClipboard';

// Click outside
export { useClickOutside, useClickOutsideMultiple } from './useClickOutside';

// Toggle
export { useToggle, useDisclosure } from './useToggle';

// Mount state
export {
  useMounted,
  useEffectOnce,
  useIsMountedRef,
  useSafeCallback,
} from './useMounted';

// Infinite scroll
export {
  useInfiniteScroll,
  useInView,
  useLazyLoad,
} from './useInfiniteScroll';

// Re-export types
export type { } from './useDebounce';
export type { } from './useLocalStorage';
export type { } from './useMediaQuery';
export type { } from './useCopyToClipboard';
export type { } from './useClickOutside';
export type { } from './useToggle';
export type { } from './useMounted';
export type { } from './useInfiniteScroll';