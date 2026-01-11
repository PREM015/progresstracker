/**
 * Application Routes
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  TRACKER: "/tracker",
  CONNECTIONS: "/connections",
  ANALYTICS: "/analytics",
  GOALS: "/goals",
  SETTINGS: "/settings",
} as const

export type Route = typeof ROUTES[keyof typeof ROUTES]

/**
 * Platform Categories
 */
export const PLATFORM_CATEGORIES = {
  DSA: "DSA",
  DEVELOPMENT: "DEVELOPMENT",
  JOBS: "JOBS",
  LEARNING: "LEARNING",
  HACKATHONS: "HACKATHONS",
  DESIGN: "DESIGN",
  PRODUCTS: "PRODUCTS",
  OTHER: "OTHER",
} as const

export type PlatformCategory = typeof PLATFORM_CATEGORIES[keyof typeof PLATFORM_CATEGORIES]

/**
 * Sync Statuses
 */
export const SYNC_STATUS = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
  SYNCING: "SYNCING",
} as const

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS]

/**
 * Theme Options
 */
export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const

export type Theme = typeof THEMES[keyof typeof THEMES]

/**
 * Sync Frequencies
 */
export const SYNC_FREQUENCIES = {
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
} as const

export type SyncFrequency = typeof SYNC_FREQUENCIES[keyof typeof SYNC_FREQUENCIES]

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  SHORT: "MMM dd, yyyy",
  LONG: "MMMM dd, yyyy",
  FULL: "EEEE, MMMM dd, yyyy",
  TIME: "HH:mm:ss",
  DATETIME: "MMM dd, yyyy HH:mm",
} as const

export type DateFormat = typeof DATE_FORMATS[keyof typeof DATE_FORMATS]

/**
 * API Response Messages
 */
export const API_MESSAGES = {
  SUCCESS: "Operation successful",
  ERROR: "Something went wrong",
  UNAUTHORIZED: "Unauthorized access",
  NOT_FOUND: "Resource not found",
  VALIDATION_ERROR: "Validation failed",
} as const

export type ApiMessage = typeof API_MESSAGES[keyof typeof API_MESSAGES]

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

/**
 * File Upload Limits
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
} as const

export type AllowedImageType = typeof UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES[number]

/**
 * Achievement Thresholds
 */
export const ACHIEVEMENT_THRESHOLDS = {
  FIRST_ENTRY: 1,
  WEEK_STREAK: 7,
  MONTH_STREAK: 30,
  PROBLEMS_100: 100,
  PROBLEMS_500: 500,
  PROBLEMS_1000: 1000,
  JOBS_50: 50,
  JOBS_100: 100,
  COURSES_5: 5,
  COURSES_10: 10,
  HACKATHONS_1: 1,
  HACKATHONS_10: 10,
  COMMITS_100: 100,
  CONTRIBUTIONS_50: 50,
  HOURS_100: 100,
} as const

/**
 * Goal Types
 */
export const GOAL_TYPES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  CUSTOM: "custom",
} as const

export type GoalType = typeof GOAL_TYPES[keyof typeof GOAL_TYPES]
