// ===== FILE: src/types/index.ts =====
// Central export file for all types

// ============================================================================
// CORE TYPES
// ============================================================================

export * from './user';
export * from './platform';
export * from './tracker';
export * from './goal';
export * from './achievement';

// ============================================================================
// ANALYTICS & STATS
// ============================================================================

export * from './analytics';

// ============================================================================
// SYNC & SCRAPER
// ============================================================================

export * from './sync';
export * from './scraper';

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export * from './notification';

// ============================================================================
// SETTINGS & PREFERENCES
// ============================================================================

export * from './settings';

// ============================================================================
// EXPORT
// ============================================================================

export * from './export';

// ============================================================================
// API & REQUESTS
// ============================================================================

export * from './api';

// ============================================================================
// AUTH & OAUTH
// ============================================================================

export * from './oauth';

// ============================================================================
// ADMIN & BILLING
// ============================================================================

export * from './admin';
export * from './billing';

// ============================================================================
// RE-EXPORT PRISMA TYPES (for convenience)
// ============================================================================

export type {
  PlatformCategory,
  AuthType,
  SyncStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  GoalStatus,
  GoalType,
  GoalMetric,
  SubscriptionStatus,
  SubscriptionTier,
  BillingInterval,
  PaymentStatus,
  ExportFormat,
  ExportStatus,
  AuditAction,
  TicketStatus,
  TicketPriority,
} from '@prisma/client';

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

/** Make some properties required */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/** Make some properties optional */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make all properties nullable */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/** Deep partial type */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Extract id from type */
export type IdOf<T extends { id: string }> = T['id'];

/** Pagination params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/** Sort params */
export interface SortParams<T extends string = string> {
  sortBy?: T;
  sortOrder?: 'asc' | 'desc';
}

/** Search params */
export interface SearchParams {
  search?: string;
  searchFields?: string[];
}

/** Common list query params */
export interface ListQueryParams<T extends string = string>
  extends PaginationParams,
    SortParams<T>,
    SearchParams {
  filters?: Record<string, unknown>;
  include?: string[];
}

/** API action result */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Async action result */
export type AsyncActionResult<T = unknown> = Promise<ActionResult<T>>;

/** Form state */
export interface FormState<T = unknown> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/** Modal state */
export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

/** Toast notification */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

/** Date range */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Time period */
export interface TimePeriod {
  value: number;
  unit: 'day' | 'week' | 'month' | 'year';
}

/** Coordinates */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Address */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/** Common component props */
export interface CommonProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/** Children prop */
export interface ChildrenProps {
  children: React.ReactNode;
}

/** Loading state prop */
export interface LoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}

/** Error state prop */
export interface ErrorProps {
  error?: string | Error | null;
  onRetry?: () => void;
}

/** Empty state prop */
export interface EmptyProps {
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

/** Combined state props */
export interface StateProps extends LoadingProps, ErrorProps, EmptyProps {}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/** Data fetching hook return */
export interface UseDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (data: T | ((prev: T | null) => T)) => void;
}

/** Pagination hook return */
export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

/** Filter hook return */
export interface UseFilterReturn<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof T) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

/** Sort hook return */
export interface UseSortReturn<T extends string> {
  sortBy: T | null;
  sortOrder: 'asc' | 'desc';
  setSort: (field: T, order?: 'asc' | 'desc') => void;
  toggleSort: (field: T) => void;
  clearSort: () => void;
}