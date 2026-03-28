// ============================================================================
// FILE: src/constants/dates.ts
// PURPOSE: Date and time constants
// ============================================================================

// =============================================================================
// TIME UNITS (in milliseconds)
// =============================================================================

export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
  YEAR: 365 * 24 * 60 * 60 * 1000, // Approximate
} as const;

// =============================================================================
// TIME UNITS (in seconds)
// =============================================================================

export const TIME_UNITS_SECONDS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60,
} as const;

// =============================================================================
// DATE FORMATS
// =============================================================================

export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  MEDIUM: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  FULL: 'dddd, MMMM DD, YYYY',
  ISO: 'YYYY-MM-DD',
  TIME_12H: 'h:mm A',
  TIME_24H: 'HH:mm',
  DATETIME_SHORT: 'MM/DD/YYYY h:mm A',
  DATETIME_MEDIUM: 'MMM DD, YYYY h:mm A',
  DATETIME_LONG: 'MMMM DD, YYYY h:mm A',
  DATETIME_ISO: 'YYYY-MM-DDTHH:mm:ss',
} as const;

// =============================================================================
// DATE RANGES
// =============================================================================

export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  LAST_7_DAYS: 'last_7_days',
  LAST_14_DAYS: 'last_14_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_60_DAYS: 'last_60_days',
  LAST_90_DAYS: 'last_90_days',
  LAST_6_MONTHS: 'last_6_months',
  LAST_12_MONTHS: 'last_12_months',
  ALL_TIME: 'all_time',
  CUSTOM: 'custom',
} as const;

export const DATE_RANGE_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
  last_year: 'Last Year',
  last_7_days: 'Last 7 Days',
  last_14_days: 'Last 14 Days',
  last_30_days: 'Last 30 Days',
  last_60_days: 'Last 60 Days',
  last_90_days: 'Last 90 Days',
  last_6_months: 'Last 6 Months',
  last_12_months: 'Last 12 Months',
  all_time: 'All Time',
  custom: 'Custom Range',
} as const;

// =============================================================================
// DAYS OF WEEK
// =============================================================================

export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// =============================================================================
// MONTHS
// =============================================================================

export const MONTHS = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
} as const;

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// =============================================================================
// TIMEZONES
// =============================================================================

export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

export const TIMEZONE_LABELS = {
  UTC: 'UTC',
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'Europe/London': 'London (GMT)',
  'Europe/Paris': 'Paris (CET)',
  'Europe/Berlin': 'Berlin (CET)',
  'Asia/Dubai': 'Dubai (GST)',
  'Asia/Kolkata': 'India (IST)',
  'Asia/Singapore': 'Singapore (SGT)',
  'Asia/Tokyo': 'Tokyo (JST)',
  'Australia/Sydney': 'Sydney (AEDT)',
} as const;

// =============================================================================
// RELATIVE TIME LABELS
// =============================================================================

export const RELATIVE_TIME_LABELS = {
  JUST_NOW: 'Just now',
  SECONDS_AGO: '%d seconds ago',
  MINUTE_AGO: 'A minute ago',
  MINUTES_AGO: '%d minutes ago',
  HOUR_AGO: 'An hour ago',
  HOURS_AGO: '%d hours ago',
  DAY_AGO: 'Yesterday',
  DAYS_AGO: '%d days ago',
  WEEK_AGO: 'A week ago',
  WEEKS_AGO: '%d weeks ago',
  MONTH_AGO: 'A month ago',
  MONTHS_AGO: '%d months ago',
  YEAR_AGO: 'A year ago',
  YEARS_AGO: '%d years ago',
} as const;

// =============================================================================
// STREAK MILESTONES
// =============================================================================

export const STREAK_MILESTONES = [
  3, 7, 14, 30, 60, 100, 180, 365, 500, 730, 1000,
] as const;

export const STREAK_MILESTONE_LABELS = {
  3: '3 Day Streak',
  7: 'Week Warrior',
  14: 'Two Week Champion',
  30: 'Monthly Master',
  60: 'Unstoppable',
  100: 'Century Streak',
  180: 'Half Year Hero',
  365: 'Year of Code',
  500: '500 Day Legend',
  730: '2 Year Achiever',
  1000: '1000 Day Champion',
} as const;

// =============================================================================
// CACHE DURATIONS (in seconds)
// =============================================================================

export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
  MONTH: 2592000, // 30 days
} as const;

// =============================================================================
// SESSION DURATIONS
// =============================================================================

export const SESSION_DURATIONS = {
  SHORT: 15 * TIME_UNITS.MINUTE, // 15 minutes
  MEDIUM: TIME_UNITS.HOUR, // 1 hour
  LONG: 24 * TIME_UNITS.HOUR, // 1 day
  WEEK: 7 * TIME_UNITS.DAY, // 7 days
  MONTH: 30 * TIME_UNITS.DAY, // 30 days
} as const;

// =============================================================================
// TOKEN EXPIRY TIMES
// =============================================================================

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * TIME_UNITS.MINUTE, // 15 minutes
  REFRESH_TOKEN: 7 * TIME_UNITS.DAY, // 7 days
  VERIFICATION_TOKEN: 24 * TIME_UNITS.HOUR, // 24 hours
  PASSWORD_RESET: TIME_UNITS.HOUR, // 1 hour
  MAGIC_LINK: 10 * TIME_UNITS.MINUTE, // 10 minutes
  EMAIL_CHANGE: 24 * TIME_UNITS.HOUR, // 24 hours
  TWO_FACTOR: 5 * TIME_UNITS.MINUTE, // 5 minutes
} as const;

// =============================================================================
// SYNC INTERVALS (in minutes)
// =============================================================================

export const SYNC_INTERVALS = {
  REALTIME: 1,
  EVERY_5_MIN: 5,
  EVERY_15_MIN: 15,
  EVERY_30_MIN: 30,
  HOURLY: 60,
  EVERY_6_HOURS: 360,
  EVERY_12_HOURS: 720,
  DAILY: 1440,
  WEEKLY: 10080,
} as const;

export const SYNC_INTERVAL_LABELS = {
  1: 'Real-time',
  5: 'Every 5 minutes',
  15: 'Every 15 minutes',
  30: 'Every 30 minutes',
  60: 'Hourly',
  360: 'Every 6 hours',
  720: 'Every 12 hours',
  1440: 'Daily',
  10080: 'Weekly',
} as const;

// =============================================================================
// RETRY DELAYS (in milliseconds)
// =============================================================================

export const RETRY_DELAYS = {
  IMMEDIATE: 0,
  SHORT: 1000, // 1 second
  MEDIUM: 5000, // 5 seconds
  LONG: 30000, // 30 seconds
  VERY_LONG: 60000, // 1 minute
} as const;

// =============================================================================
// RATE LIMIT WINDOWS (in seconds)
// =============================================================================

export const RATE_LIMIT_WINDOWS = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return RELATIVE_TIME_LABELS.JUST_NOW;
  if (minutes < 60) return RELATIVE_TIME_LABELS.MINUTES_AGO.replace('%d', minutes.toString());
  if (hours < 24) return RELATIVE_TIME_LABELS.HOURS_AGO.replace('%d', hours.toString());
  if (days < 7) return RELATIVE_TIME_LABELS.DAYS_AGO.replace('%d', days.toString());
  if (days < 30) return RELATIVE_TIME_LABELS.WEEKS_AGO.replace('%d', Math.floor(days / 7).toString());
  if (days < 365) return RELATIVE_TIME_LABELS.MONTHS_AGO.replace('%d', Math.floor(days / 30).toString());
  return RELATIVE_TIME_LABELS.YEARS_AGO.replace('%d', Math.floor(days / 365).toString());
}

// =============================================================================
// EXPORTS
// =============================================================================

const DATES_EXPORT = {
  TIME_UNITS,
  TIME_UNITS_SECONDS,
  DATE_FORMATS,
  DATE_RANGES,
  DATE_RANGE_LABELS,
  DAYS_OF_WEEK,
  DAY_NAMES_SHORT,
  DAY_NAMES_LONG,
  MONTHS,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_LONG,
  COMMON_TIMEZONES,
  TIMEZONE_LABELS,
  RELATIVE_TIME_LABELS,
  STREAK_MILESTONES,
  STREAK_MILESTONE_LABELS,
  CACHE_DURATIONS,
  SESSION_DURATIONS,
  TOKEN_EXPIRY,
  SYNC_INTERVALS,
  SYNC_INTERVAL_LABELS,
  RETRY_DELAYS,
  RATE_LIMIT_WINDOWS,
  formatDuration,
  getRelativeTime,
};

export default DATES_EXPORT;