// ===== FILE: src/types/api.ts =====
// Complete API types for requests, responses, and error handling

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Standard API response wrapper */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  meta?: ResponseMeta;
}

/** Pagination information */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

/** Response metadata */
export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  executionTime?: number;
  cached?: boolean;
  cacheAge?: number;
}

/** API error response */
export interface APIError {
  success: false;
  error: string;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
  stack?: string;
  timestamp: string;
  path?: string;
  method?: string;
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/** API error with validation details */
export interface APIValidationError extends APIError {
  validationErrors: ValidationError[];
}

// =============================================================================
// REQUEST TYPES
// =============================================================================

/** Common query parameters */
export interface QueryParams {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: string;
  include?: string;
  fields?: string;
}

/** Date range query */
export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '14d' | '30d' | '90d' | '365d' | 'all';
}

/** Request context (for logging/tracking) */
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  path: string;
  method: string;
  timestamp: Date;
}

/** Rate limit info */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/** API request headers */
export interface APIHeaders {
  'Content-Type'?: string;
  Authorization?: string;
  'X-Request-ID'?: string;
  'X-API-Key'?: string;
  'X-Rate-Limit-Limit'?: string;
  'X-Rate-Limit-Remaining'?: string;
  'X-Rate-Limit-Reset'?: string;
}

// =============================================================================
// ERROR CODES
// =============================================================================

/** Standard error codes */
export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',

  // Custom errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  PLATFORM_ERROR: 'PLATFORM_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// =============================================================================
// API ENDPOINT TYPES
// =============================================================================

/** API endpoint definition */
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  auth: boolean;
  rateLimit?: {
    limit: number;
    window: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

/** API version info */
export interface APIVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
}

// =============================================================================
// BULK OPERATION TYPES
// =============================================================================

/** Bulk operation result */
export interface BulkOperationalResult<T = unknown> {
  success: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  errors: Array<{
    index: number;
    error: string;
    code: string;
  }>;
}

/** Batch request item */
export interface BatchRequestItem {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
}

/** Batch response item */
export interface BatchResponseItem<T = unknown> {
  id: string;
  status: number;
  body: APIResponse<T>;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/** Webhook payload */
export interface WebhookPayload<T = unknown> {
  id: string;
  event: string;
  timestamp: string;
  data: T;
  signature?: string;
}

/** Webhook event types */
export type WebhookEvent =
  | 'sync.started'
  | 'sync.completed'
  | 'sync.failed'
  | 'goal.completed'
  | 'achievement.unlocked'
  | 'streak.milestone'
  | 'export.ready';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Create success response */
export function createSuccessResponse<T>(data: T, message?: string): APIResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/** Create error response */
export function createErrorResponse(
  error: string,
  code: ErrorCode,
  statusCode: HttpStatus,
  details?: unknown
): APIError {
  return {
    success: false,
    error,
    message: error,
    code,
    statusCode,
    details,
    timestamp: new Date().toISOString(),
  };
}

/** Create paginated response */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalItems / limit);
  const offset = (page - 1) * limit;

  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize: limit,
      limit,
      offset,
      totalPages,
      totalItems,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
    },
  };
}

/** Check if response is error */
export function isAPIError(response: unknown): response is APIError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as APIResponse).success === false
  );
}

/** Get error message from response */
export function getErrorMessage(error: unknown): string {
  if (isAPIError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/** Parse query params from URL */
export function parseQueryParams(url: string): QueryParams {
  const params = new URLSearchParams(url.split('?')[1] || '');
  return {
    page: params.get('page') ? parseInt(params.get('page')!) : undefined,
    limit: params.get('limit') ? parseInt(params.get('limit')!) : undefined,
    offset: params.get('offset') ? parseInt(params.get('offset')!) : undefined,
    sort: params.get('sort') || undefined,
    order: (params.get('order') as 'asc' | 'desc') || undefined,
    search: params.get('search') || undefined,
    filter: params.get('filter') || undefined,
    include: params.get('include') || undefined,
    fields: params.get('fields') || undefined,
  };
}

/** Build query string from params */
export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export default APIResponse;