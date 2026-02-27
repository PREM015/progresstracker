// ============================================================================
// FILE: lib/timezone.ts
// PURPOSE: Timezone handling utilities
// ============================================================================

import { formatInTimeZone, toZonedTime, fromZonedTime, getTimezoneOffset as getOffset } from 'date-fns-tz';
import { format, startOfDay as startOfDayFns, endOfDay as endOfDayFns } from 'date-fns';
import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  offsetMinutes: number;
  region: string;
  popular?: boolean;
}

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  offsetMinutes: number;
  isDST: boolean;
  abbreviation: string;
}

export interface ConversionResult {
  original: Date;
  converted: Date;
  timezone: string;
  offset: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default timezone fallback
 */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Popular timezones grouped by region
 */
export const TIMEZONE_REGIONS = {
  POPULAR: 'Popular',
  AMERICAS: 'Americas',
  EUROPE: 'Europe',
  ASIA: 'Asia',
  PACIFIC: 'Pacific',
  AFRICA: 'Africa',
  ATLANTIC: 'Atlantic',
} as const;

/**
 * Comprehensive timezone list with offsets
 */
export const TIMEZONES: TimezoneOption[] = [
  // Popular timezones
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00', offsetMinutes: 0, region: 'POPULAR', popular: true },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: '-05:00', offsetMinutes: -300, region: 'POPULAR', popular: true },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: '-06:00', offsetMinutes: -360, region: 'POPULAR', popular: true },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: '-07:00', offsetMinutes: -420, region: 'POPULAR', popular: true },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: '-08:00', offsetMinutes: -480, region: 'POPULAR', popular: true },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00', offsetMinutes: 0, region: 'POPULAR', popular: true },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00', offsetMinutes: 60, region: 'POPULAR', popular: true },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', offsetMinutes: 540, region: 'POPULAR', popular: true },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00', offsetMinutes: 480, region: 'POPULAR', popular: true },
  { value: 'Asia/Kolkata', label: 'India Standard Time', offset: '+05:30', offsetMinutes: 330, region: 'POPULAR', popular: true },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)', offset: '+11:00', offsetMinutes: 660, region: 'POPULAR', popular: true },

  // Americas
  { value: 'America/Anchorage', label: 'Alaska', offset: '-09:00', offsetMinutes: -540, region: 'AMERICAS' },
  { value: 'America/Phoenix', label: 'Arizona', offset: '-07:00', offsetMinutes: -420, region: 'AMERICAS' },
  { value: 'America/Toronto', label: 'Toronto', offset: '-05:00', offsetMinutes: -300, region: 'AMERICAS' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00', offsetMinutes: -480, region: 'AMERICAS' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00', offsetMinutes: -360, region: 'AMERICAS' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00', offsetMinutes: -180, region: 'AMERICAS' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: '-03:00', offsetMinutes: -180, region: 'AMERICAS' },
  { value: 'America/Santiago', label: 'Santiago', offset: '-03:00', offsetMinutes: -180, region: 'AMERICAS' },
  { value: 'America/Lima', label: 'Lima', offset: '-05:00', offsetMinutes: -300, region: 'AMERICAS' },
  { value: 'America/Bogota', label: 'Bogota', offset: '-05:00', offsetMinutes: -300, region: 'AMERICAS' },

  // Europe
  { value: 'Europe/Dublin', label: 'Dublin', offset: '+00:00', offsetMinutes: 0, region: 'EUROPE' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Rome', label: 'Rome', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Brussels', label: 'Brussels', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Vienna', label: 'Vienna', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Warsaw', label: 'Warsaw', offset: '+01:00', offsetMinutes: 60, region: 'EUROPE' },
  { value: 'Europe/Athens', label: 'Athens', offset: '+02:00', offsetMinutes: 120, region: 'EUROPE' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: '+02:00', offsetMinutes: 120, region: 'EUROPE' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: '+03:00', offsetMinutes: 180, region: 'EUROPE' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00', offsetMinutes: 180, region: 'EUROPE' },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00', offsetMinutes: 240, region: 'ASIA' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: '+05:00', offsetMinutes: 300, region: 'ASIA' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: '+06:00', offsetMinutes: 360, region: 'ASIA' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: '+07:00', offsetMinutes: 420, region: 'ASIA' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00', offsetMinutes: 480, region: 'ASIA' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+08:00', offsetMinutes: 480, region: 'ASIA' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: '+08:00', offsetMinutes: 480, region: 'ASIA' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: '+09:00', offsetMinutes: 540, region: 'ASIA' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: '+07:00', offsetMinutes: 420, region: 'ASIA' },
  { value: 'Asia/Manila', label: 'Manila', offset: '+08:00', offsetMinutes: 480, region: 'ASIA' },

  // Pacific
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+11:00', offsetMinutes: 660, region: 'PACIFIC' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: '+10:00', offsetMinutes: 600, region: 'PACIFIC' },
  { value: 'Australia/Perth', label: 'Perth', offset: '+08:00', offsetMinutes: 480, region: 'PACIFIC' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: '+13:00', offsetMinutes: 780, region: 'PACIFIC' },
  { value: 'Pacific/Fiji', label: 'Fiji', offset: '+12:00', offsetMinutes: 720, region: 'PACIFIC' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: '-10:00', offsetMinutes: -600, region: 'PACIFIC' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: '+02:00', offsetMinutes: 120, region: 'AFRICA' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: '+02:00', offsetMinutes: 120, region: 'AFRICA' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: '+01:00', offsetMinutes: 60, region: 'AFRICA' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: '+03:00', offsetMinutes: 180, region: 'AFRICA' },

  // Atlantic
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik', offset: '+00:00', offsetMinutes: 0, region: 'ATLANTIC' },
  { value: 'Atlantic/Azores', label: 'Azores', offset: '-01:00', offsetMinutes: -60, region: 'ATLANTIC' },
];

/**
 * Timezone cache for performance
 */
const timezoneCache = new Map<string, TimezoneInfo>();

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get user's timezone from database
 * 
 * @param userId - User ID
 * @returns User's timezone string
 * 
 * @example
 * ```ts
 * const timezone = await getUserTimezone('user_123');
 * // Returns: 'America/New_York'
 * ```
 */
export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    return user?.timezone || DEFAULT_TIMEZONE;
  } catch (error) {
    console.error('Error fetching user timezone:', error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Convert UTC date to user's timezone
 * 
 * @param date - Date in UTC
 * @param timezone - Target timezone
 * @returns Date in user's timezone
 * 
 * @example
 * ```ts
 * const utcDate = new Date('2024-01-15T12:00:00Z');
 * const userDate = convertToUserTimezone(utcDate, 'America/New_York');
 * ```
 */
export function convertToUserTimezone(date: Date, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    console.warn(`Invalid timezone: ${timezone}, using UTC`);
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    return toZonedTime(date, timezone);
  } catch (error) {
    console.error('Error converting to user timezone:', error);
    return date;
  }
}

/**
 * Convert date from user's timezone to UTC
 * 
 * @param date - Date in user's timezone
 * @param timezone - User's timezone
 * @returns Date in UTC
 * 
 * @example
 * ```ts
 * const userDate = new Date('2024-01-15T12:00:00');
 * const utcDate = convertFromUserTimezone(userDate, 'America/New_York');
 * ```
 */
export function convertFromUserTimezone(date: Date, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    console.warn(`Invalid timezone: ${timezone}, using UTC`);
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    return fromZonedTime(date, timezone);
  } catch (error) {
    console.error('Error converting from user timezone:', error);
    return date;
  }
}

/**
 * Get start of day in specific timezone
 * 
 * @param date - Date
 * @param timezone - Timezone
 * @returns Start of day in timezone
 * 
 * @example
 * ```ts
 * const start = getStartOfDay(new Date(), 'America/New_York');
 * // Returns: 2024-01-15 00:00:00 in New York time
 * ```
 */
export function getStartOfDay(date: Date, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    // Convert to user timezone
    const zonedDate = toZonedTime(date, timezone);
    
    // Get start of day in that timezone
    const startOfDay = startOfDayFns(zonedDate);
    
    // Convert back to UTC
    return fromZonedTime(startOfDay, timezone);
  } catch (error) {
    console.error('Error getting start of day:', error);
    return startOfDayFns(date);
  }
}

/**
 * Get end of day in specific timezone
 * 
 * @param date - Date
 * @param timezone - Timezone
 * @returns End of day in timezone
 * 
 * @example
 * ```ts
 * const end = getEndOfDay(new Date(), 'America/New_York');
 * // Returns: 2024-01-15 23:59:59 in New York time
 * ```
 */
export function getEndOfDay(date: Date, timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    // Convert to user timezone
    const zonedDate = toZonedTime(date, timezone);
    
    // Get end of day in that timezone
    const endOfDay = endOfDayFns(zonedDate);
    
    // Convert back to UTC
    return fromZonedTime(endOfDay, timezone);
  } catch (error) {
    console.error('Error getting end of day:', error);
    return endOfDayFns(date);
  }
}

/**
 * Get timezone offset in minutes
 * 
 * @param timezone - Timezone string
 * @param date - Date to calculate offset for (handles DST)
 * @returns Offset in minutes from UTC
 * 
 * @example
 * ```ts
 * const offset = getTimezoneOffset('America/New_York');
 * // Returns: -300 (EST) or -240 (EDT)
 * ```
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  if (!isValidTimezone(timezone)) {
    return 0;
  }

  try {
    const offset = getOffset(timezone, date);
    return offset / 1000 / 60; // Convert milliseconds to minutes
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return 0;
  }
}

/**
 * Validate timezone string
 * 
 * @param timezone - Timezone to validate
 * @returns True if valid IANA timezone
 * 
 * @example
 * ```ts
 * isValidTimezone('America/New_York'); // true
 * isValidTimezone('Invalid/Timezone'); // false
 * ```
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Try to format a date with this timezone
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get complete timezone list for dropdowns
 * 
 * @param includePopular - Include popular timezones separately
 * @returns Array of timezone options
 */
export function getTimezoneList(includePopular: boolean = true): TimezoneOption[] {
  if (includePopular) {
    return TIMEZONES;
  }

  return TIMEZONES.filter(tz => !tz.popular);
}

/**
 * Get timezone list grouped by region
 * 
 * @returns Timezones grouped by region
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  const grouped: Record<string, TimezoneOption[]> = {};

  for (const tz of TIMEZONES) {
    if (!grouped[tz.region]) {
      grouped[tz.region] = [];
    }
    grouped[tz.region].push(tz);
  }

  return grouped;
}

/**
 * Format date in specific timezone
 * 
 * @param date - Date to format
 * @param timezone - Timezone
 * @param formatString - Format string (date-fns format)
 * @returns Formatted date string
 * 
 * @example
 * ```ts
 * const formatted = formatInTimezone(
 *   new Date(),
 *   'America/New_York',
 *   'yyyy-MM-dd HH:mm:ss'
 * );
 * // Returns: '2024-01-15 12:30:45'
 * ```
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  if (!isValidTimezone(timezone)) {
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    return formatInTimeZone(date, timezone, formatString);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return format(date, formatString);
  }
}

// ============================================================================
// ADVANCED FUNCTIONS
// ============================================================================

/**
 * Get detailed timezone information
 * 
 * @param timezone - Timezone string
 * @param date - Date to get info for
 * @returns Timezone information
 */
export function getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
  const cacheKey = `${timezone}_${date.getTime()}`;
  
  if (timezoneCache.has(cacheKey)) {
    return timezoneCache.get(cacheKey)!;
  }

  if (!isValidTimezone(timezone)) {
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    const offsetMinutes = getTimezoneOffset(timezone, date);
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

    // Try to get abbreviation
    let abbreviation = '';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      });
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      abbreviation = timeZonePart?.value || '';
    } catch {
      abbreviation = timezone.split('/').pop() || '';
    }

    // Determine if DST (rough approximation)
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const janOffset = getTimezoneOffset(timezone, jan);
    const julOffset = getTimezoneOffset(timezone, jul);
    const isDST = offsetMinutes !== Math.max(janOffset, julOffset);

    const info: TimezoneInfo = {
      timezone,
      offset,
      offsetMinutes,
      isDST,
      abbreviation,
    };

    timezoneCache.set(cacheKey, info);
    return info;
  } catch (error) {
    console.error('Error getting timezone info:', error);
    return {
      timezone: DEFAULT_TIMEZONE,
      offset: '+00:00',
      offsetMinutes: 0,
      isDST: false,
      abbreviation: 'UTC',
    };
  }
}

/**
 * Find timezone by offset
 * 
 * @param offsetMinutes - Offset in minutes from UTC
 * @returns Array of matching timezones
 */
export function findTimezonesByOffset(offsetMinutes: number): TimezoneOption[] {
  return TIMEZONES.filter(tz => tz.offsetMinutes === offsetMinutes);
}

/**
 * Guess user's timezone from browser
 * 
 * @returns Detected timezone or UTC
 */
export function guessUserTimezone(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TIMEZONE;
  }

  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(detected) ? detected : DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Calculate hours until midnight in timezone
 * 
 * @param timezone - Timezone
 * @returns Hours until midnight
 */
export function hoursUntilMidnight(timezone: string): number {
  if (!isValidTimezone(timezone)) {
    timezone = DEFAULT_TIMEZONE;
  }

  try {
    const now = new Date();
    const todayEnd = getEndOfDay(now, timezone);
    const diffMs = todayEnd.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  } catch (error) {
    console.error('Error calculating hours until midnight:', error);
    return 0;
  }
}

/**
 * Check if two dates are the same day in a timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @param timezone - Timezone to compare in
 * @returns True if same day
 */
export function isSameDayInTimezone(
  date1: Date,
  date2: Date,
  timezone: string
): boolean {
  try {
    const formatted1 = formatInTimezone(date1, timezone, 'yyyy-MM-dd');
    const formatted2 = formatInTimezone(date2, timezone, 'yyyy-MM-dd');
    return formatted1 === formatted2;
  } catch (error) {
    console.error('Error comparing dates in timezone:', error);
    return false;
  }
}

/**
 * Get current time in timezone
 * 
 * @param timezone - Timezone
 * @returns Current time in timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  return convertToUserTimezone(new Date(), timezone);
}

/**
 * Parse time string in timezone context
 * 
 * @param timeStr - Time string (HH:MM format)
 * @param timezone - Timezone
 * @param baseDate - Base date to apply time to
 * @returns Date object
 */
export function parseTimeInTimezone(
  timeStr: string,
  timezone: string,
  baseDate: Date = new Date()
): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid time format. Use HH:MM');
  }

  // Get date in user's timezone
  const zonedDate = toZonedTime(baseDate, timezone);
  zonedDate.setHours(hours, minutes, 0, 0);

  // Convert back to UTC
  return fromZonedTime(zonedDate, timezone);
}

/**
 * Get timezone-aware date range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param timezone - Timezone
 * @returns Date range with timezone applied
 */
export function getTimezoneAwareDateRange(
  startDate: Date,
  endDate: Date,
  timezone: string
): { start: Date; end: Date } {
  return {
    start: getStartOfDay(startDate, timezone),
    end: getEndOfDay(endDate, timezone),
  };
}

/**
 * Search timezones by name or city
 * 
 * @param query - Search query
 * @returns Matching timezones
 */
export function searchTimezones(query: string): TimezoneOption[] {
  const lowerQuery = query.toLowerCase();
  
  return TIMEZONES.filter(tz =>
    tz.label.toLowerCase().includes(lowerQuery) ||
    tz.value.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get popular timezones
 * 
 * @returns Popular timezones only
 */
export function getPopularTimezones(): TimezoneOption[] {
  return TIMEZONES.filter(tz => tz.popular);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert offset minutes to string
 * 
 * @param minutes - Offset in minutes
 * @returns Offset string (e.g., '+05:30')
 */
export function formatOffset(minutes: number): string {
  const hours = Math.abs(Math.floor(minutes / 60));
  const mins = Math.abs(minutes % 60);
  const sign = minutes >= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parse offset string to minutes
 * 
 * @param offset - Offset string (e.g., '+05:30')
 * @returns Offset in minutes
 */
export function parseOffset(offset: string): number {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;

  const [, sign, hours, minutes] = match;
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
  return sign === '+' ? totalMinutes : -totalMinutes;
}

/**
 * Get timezone from option value
 * 
 * @param value - Timezone value
 * @returns TimezoneOption or undefined
 */
export function getTimezoneOption(value: string): TimezoneOption | undefined {
  return TIMEZONES.find(tz => tz.value === value);
}

// ============================================================================
// EXPORTS
// ============================================================================

const timezone = {
  // Core functions
  getUserTimezone,
  convertToUserTimezone,
  convertFromUserTimezone,
  getStartOfDay,
  getEndOfDay,
  getTimezoneOffset,
  isValidTimezone,
  getTimezoneList,
  formatInTimezone,

  // Advanced functions
  getTimezoneInfo,
  getTimezonesByRegion,
  findTimezonesByOffset,
  guessUserTimezone,
  hoursUntilMidnight,
  isSameDayInTimezone,
  getCurrentTimeInTimezone,
  parseTimeInTimezone,
  getTimezoneAwareDateRange,
  searchTimezones,
  getPopularTimezones,

  // Utilities
  formatOffset,
  parseOffset,
  getTimezoneOption,

  // Constants
  DEFAULT_TIMEZONE,
  TIMEZONES,
  TIMEZONE_REGIONS,
};

export default timezone