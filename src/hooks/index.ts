// ============================================================================
// FILE: src/hooks/index.ts
// PURPOSE: Central export for all hooks
// ============================================================================

// =============================================================================
// QUERY KEYS
// =============================================================================
export { queryKeys } from './keys';

// =============================================================================
// AUTHENTICATION
// =============================================================================
export { useAuth } from './useAuth';
export type { } from './useAuth';

// =============================================================================
// USER
// =============================================================================
export { useUser } from './useUser';
export type { } from './useUser';

// =============================================================================
// TRACKER
// =============================================================================
export {
  useTracker,
  useTrackerEntry,
} from './useTracker';
export type { } from './useTracker';

// =============================================================================
// PLATFORMS
// =============================================================================
export {
  usePlatforms,
} from './usePlatforms';
export type { } from './usePlatforms';

// =============================================================================
// GOALS
// =============================================================================
export { useGoals, useGoal } from './useGoals';
export type { } from './useGoals';

// =============================================================================
// ACHIEVEMENTS
// =============================================================================
export {
  useAchievements,
} from './useAchievements';
export type { } from './useAchievements';

// =============================================================================
// STREAK
// =============================================================================
export { useStreak } from './useStreak';
export type { } from './useStreak';

// =============================================================================
// NOTIFICATIONS
// =============================================================================
export { useNotifications } from './useNotifications';
export type { } from './useNotifications';

// =============================================================================
// STATS
// =============================================================================
export { useStats } from './useStats';
export type { } from './useStats';

// =============================================================================
// SYNC
// =============================================================================
export { useSync } from './useSync';
export type { } from './useSync';

// =============================================================================
// SETTINGS
// =============================================================================
export { useSettings } from './useSettings';
export type { } from './useSettings';

// =============================================================================
// LEADERBOARD
// =============================================================================
export {
  useLeaderboard,
  useDailyLeaderboard,
  useWeeklyLeaderboard,
  useMonthlyLeaderboard,
  useFriendsLeaderboard,
  usePlatformLeaderboard,
} from './useLeaderboard';
export type { } from './useLeaderboard';

// =============================================================================
// SEARCH
// =============================================================================
export { useSearch } from './useSearch';
export type { } from './useSearch';

// =============================================================================
// EXPORT
// =============================================================================
export { useExport } from './useExport';
export type { } from './useExport';

// =============================================================================
// SUBSCRIPTION
// =============================================================================
export { useSubscription } from './useSubscription';
export type { } from './useSubscription';

// =============================================================================
// ADMIN
// =============================================================================
export {
  useAdmin,
  useAdminDashboard,
  useAdminUsers,
  useAdminUser,
  useAdminStats,
} from './useAdmin';
export type { } from './useAdmin';

// =============================================================================
// UTILITY HOOKS
// =============================================================================
export {
  // Debounce
  useDebounce,
  useDebouncedCallback,
  // Storage
  useLocalStorage,
  // Media queries
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  // Clipboard
  useCopyToClipboard,
  // Click outside
  useClickOutside,
  useClickOutsideMultiple,
  // Toggle
  useToggle,
  useDisclosure,
  // Mount state
  useMounted,
  useEffectOnce,
  useIsMountedRef,
  useSafeCallback,
  // Infinite scroll
  useInfiniteScroll,
  useInView,
  useLazyLoad,
} from './utils';