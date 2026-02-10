// ============================================================================
// FILE: src/constants/errorMessages.ts
// PURPOSE: Centralized error messages for consistent user feedback
// ============================================================================

// GENERAL ERRORS:
export const GENERAL_ERRORS = {
    UNKNOWN: 'An unexpected error occurred. Please try again.',
    NETWORK: 'Unable to connect to the server. Please check your internet connection.',
    TIMEOUT: 'The request timed out. Please try again.',
    SERVER: 'Server error. Our team has been notified.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    MAINTENANCE: 'The system is currently undergoing maintenance. Please try again later.',
} as const;

// AUTH ERRORS:
export const AUTH_ERRORS = {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in.',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You must be logged in to access this resource.',
    INVALID_TOKEN: 'The token is invalid or has expired.',
    EMAIL_IN_USE: 'This email is already registered.',
    USERNAME_IN_USE: 'This username is already taken.',
    WEAK_PASSWORD: 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.',
    PASSWORD_MISMATCH: 'Passwords do not match.',
    INVALID_2FA_CODE: 'Invalid verification code.',
    TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please try again later.',
    OAUTH_ERROR: 'Failed to authenticate with the provider.',
    SOCIAL_ACCOUNT_EXISTS: 'This social account is already linked to another user.',
} as const;

// VALIDATION ERRORS:
export const VALIDATION_ERRORS = {
    REQUIRED: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_URL: 'Please enter a valid URL.',
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters.`,
    MAX_LENGTH: (max: number) => `Must be no more than ${max} characters.`,
    MIN_VALUE: (min: number) => `Must be at least ${min}.`,
    MAX_VALUE: (max: number) => `Must be no more than ${max}.`,
    INVALID_DATE: 'Please enter a valid date.',
    DATE_IN_PAST: 'Date cannot be in the past.',
    DATE_IN_FUTURE: 'Date cannot be in the future.',
    INVALID_FORMAT: 'Invalid format.',
} as const;

// TRACKER ERRORS:
export const TRACKER_ERRORS = {
    ENTRY_NOT_FOUND: 'Entry not found.',
    DUPLICATE_ENTRY: 'An entry for this date and platform already exists.',
    INVALID_PLATFORM: 'Invalid platform selected.',
    SYNC_IN_PROGRESS: 'Sync is already in progress.',
    SYNC_FAILED: 'Failed to sync with platform. Please try again.',
} as const;

// GOAL ERRORS:
export const GOAL_ERRORS = {
    GOAL_NOT_FOUND: 'Goal not found.',
    ALREADY_COMPLETED: 'This goal is already completed.',
    INVALID_TARGET: 'Invalid target value.',
    DEADLINE_PASSED: 'The deadline has already passed.',
    ARCHIVE_FAILED: 'Failed to archive goal.',
} as const;

// PLATFORM ERRORS:
export const PLATFORM_ERRORS = {
    CONNECTION_FAILED: 'Failed to connect to platform.',
    ALREADY_CONNECTED: 'Platform is already connected.',
    INVALID_USERNAME: 'Invalid username for this platform.',
    PROFILE_NOT_FOUND: 'Platform profile not found.',
    API_LIMIT: 'Platform API rate limit reached. Please try again later.',
    OAUTH_EXPIRED: 'Platform authentication expired. Please reconnect.',
} as const;

// SUBSCRIPTION ERRORS:
export const SUBSCRIPTION_ERRORS = {
    PAYMENT_FAILED: 'Payment failed. Please check your payment method.',
    SUBSCRIPTION_REQUIRED: 'This feature requires a subscription.',
    UPGRADE_REQUIRED: 'Please upgrade your plan to access this feature.',
    CANCELLATION_FAILED: 'Failed to cancel subscription.',
} as const;

// FILE UPLOAD ERRORS:
export const UPLOAD_ERRORS = {
    FILE_TOO_LARGE: (maxSize: string) => `File size exceeds ${maxSize} limit.`,
    INVALID_TYPE: 'Invalid file type.',
    UPLOAD_FAILED: 'Failed to upload file.',
} as const;

// HELPER: Get error message from error object or code
export function getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        const obj = error as Record<string, unknown>;
        if (typeof obj.message === 'string') return obj.message;
        if (typeof obj.error === 'string') return obj.error;
    }
    return GENERAL_ERRORS.UNKNOWN;
}

// HTTP STATUS TO MESSAGE:
export function getHttpErrorMessage(status: number): string {
    switch (status) {
        case 400: return 'Bad request. Please check your input.';
        case 401: return AUTH_ERRORS.UNAUTHORIZED;
        case 403: return GENERAL_ERRORS.FORBIDDEN;
        case 404: return GENERAL_ERRORS.NOT_FOUND;
        case 409: return 'Conflict. The resource already exists.';
        case 422: return 'Validation failed. Please check your input.';
        case 429: return AUTH_ERRORS.TOO_MANY_ATTEMPTS;
        case 500: return GENERAL_ERRORS.SERVER;
        case 502: return 'Bad gateway. Please try again.';
        case 503: return GENERAL_ERRORS.MAINTENANCE;
        case 504: return GENERAL_ERRORS.TIMEOUT;
        default: return GENERAL_ERRORS.UNKNOWN;
    }
}
