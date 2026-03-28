// ============================================================================
// FILE: src/constants/regex.ts
// PURPOSE: Regular expression patterns for validation
// ============================================================================

// =============================================================================
// USER INPUT VALIDATION
// =============================================================================

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/; // E.164 format
export const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

// At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
export const PASSWORD_STRONG_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// At least 8 characters, 1 letter, 1 number
export const PASSWORD_MEDIUM_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

// At least 8 characters
export const PASSWORD_WEAK_REGEX = /^.{8,}$/;

// Individual password requirements
export const PASSWORD_HAS_UPPERCASE = /[A-Z]/;
export const PASSWORD_HAS_LOWERCASE = /[a-z]/;
export const PASSWORD_HAS_NUMBER = /\d/;
export const PASSWORD_HAS_SPECIAL = /[@$!%*?&]/;
export const PASSWORD_MIN_LENGTH = /.{8,}/;

// =============================================================================
// PLATFORM-SPECIFIC USERNAMES
// =============================================================================

// LeetCode: alphanumeric, underscore, hyphen
export const LEETCODE_USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,15}$/;

// GitHub: alphanumeric, hyphen (cannot start with hyphen)
export const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

// Codeforces: alphanumeric, underscore
export const CODEFORCES_USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

// CodeChef: alphanumeric, underscore (starts with letter)
export const CODECHEF_USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

// HackerRank: alphanumeric, underscore, hyphen
export const HACKERRANK_USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,40}$/;

// LinkedIn: alphanumeric, hyphen
export const LINKEDIN_USERNAME_REGEX = /^[a-zA-Z0-9-]{3,100}$/;

// Kaggle: alphanumeric (lowercase)
export const KAGGLE_USERNAME_REGEX = /^[a-z0-9]{3,30}$/;

// =============================================================================
// CODE & TECHNICAL
// =============================================================================

// API Key format (alphanumeric, hyphens, underscores)
export const API_KEY_REGEX = /^[a-zA-Z0-9_-]{16,128}$/;

// JWT Token format
export const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;

// UUID v4
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Semantic Version (semver)
export const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// Git commit hash (short)
export const GIT_SHORT_HASH_REGEX = /^[0-9a-f]{7}$/i;

// Git commit hash (full)
export const GIT_FULL_HASH_REGEX = /^[0-9a-f]{40}$/i;

// IP Address (IPv4)
export const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IP Address (IPv6)
export const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

// Hex Color
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// =============================================================================
// SOCIAL MEDIA
// =============================================================================

// Twitter handle
export const TWITTER_HANDLE_REGEX = /^@?[A-Za-z0-9_]{1,15}$/;

// Discord username
export const DISCORD_USERNAME_REGEX = /^.{2,32}#[0-9]{4}$/;

// Instagram username
export const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

// =============================================================================
// DATES & TIME
// =============================================================================

// Date in YYYY-MM-DD format
export const DATE_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Date in MM/DD/YYYY format
export const DATE_MM_DD_YYYY_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

// Time in HH:MM format (24-hour)
export const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Time in HH:MM AM/PM format (12-hour)
export const TIME_12H_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)$/;

// ISO 8601 DateTime
export const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

// =============================================================================
// FILE NAMES & PATHS
// =============================================================================

// File extension
export const FILE_EXTENSION_REGEX = /\.[0-9a-z]+$/i;

// Image file extensions
export const IMAGE_FILE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;

// Document file extensions
export const DOCUMENT_FILE_REGEX = /\.(pdf|doc|docx|txt|rtf|odt)$/i;

// Video file extensions
export const VIDEO_FILE_REGEX = /\.(mp4|avi|mov|wmv|flv|mkv|webm)$/i;

// Archive file extensions
export const ARCHIVE_FILE_REGEX = /\.(zip|rar|7z|tar|gz|bz2)$/i;

// =============================================================================
// NUMBERS & CURRENCY
// =============================================================================

// Integer (positive)
export const POSITIVE_INTEGER_REGEX = /^\d+$/;

// Integer (negative allowed)
export const INTEGER_REGEX = /^-?\d+$/;

// Decimal number (positive)
export const POSITIVE_DECIMAL_REGEX = /^\d+(\.\d+)?$/;

// Decimal number (negative allowed)
export const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;

// Currency (USD format with optional cents)
export const CURRENCY_USD_REGEX = /^\$?\d{1,3}(,?\d{3})*(\.\d{2})?$/;

// Percentage
export const PERCENTAGE_REGEX = /^(100(\.0{1,2})?|[0-9]{1,2}(\.\d{1,2})?)%?$/;

// =============================================================================
// SECURITY
// =============================================================================

// Common SQL injection patterns (for additional validation)
export const SQL_INJECTION_REGEX = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(['";])/i;

// XSS patterns (for additional validation)
export const XSS_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// CSRF token format
export const CSRF_TOKEN_REGEX = /^[a-zA-Z0-9_-]{32,}$/;

// =============================================================================
// CONTENT VALIDATION
// =============================================================================

// Hashtag
export const HASHTAG_REGEX = /^#[a-zA-Z0-9_]{1,30}$/;

// Mention
export const MENTION_REGEX = /^@[a-zA-Z0-9_]{1,30}$/;

// Markdown heading
export const MARKDOWN_HEADING_REGEX = /^#{1,6}\s+.+$/;

// HTML tag
export const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url);
}

export function isValidPassword(password: string, strength: 'weak' | 'medium' | 'strong' = 'medium'): boolean {
  switch (strength) {
    case 'strong':
      return PASSWORD_STRONG_REGEX.test(password);
    case 'medium':
      return PASSWORD_MEDIUM_REGEX.test(password);
    case 'weak':
      return PASSWORD_WEAK_REGEX.test(password);
    default:
      return false;
  }
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' | 'very-weak' {
  if (!PASSWORD_MIN_LENGTH.test(password)) return 'very-weak';
  if (PASSWORD_STRONG_REGEX.test(password)) return 'strong';
  if (PASSWORD_MEDIUM_REGEX.test(password)) return 'medium';
  return 'weak';
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

export function isValidIPv4(ip: string): boolean {
  return IPV4_REGEX.test(ip);
}

export function isValidIPv6(ip: string): boolean {
  return IPV6_REGEX.test(ip);
}

export function sanitizeInput(input: string): string {
  // Remove potential XSS and SQL injection patterns
  return input
    .replace(XSS_REGEX, '')
    .replace(/['";<>]/g, '')
    .trim();
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map((tag) => tag.substring(1)) : [];
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_]+/g);
  return matches ? matches.map((mention) => mention.substring(1)) : [];
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  return matches || [];
}

// =============================================================================
// EXPORTS
// =============================================================================

const REGEX_EXPORT = {
  // User Input
  USERNAME: USERNAME_REGEX,
  EMAIL: EMAIL_REGEX,
  PHONE: PHONE_REGEX,
  URL: URL_REGEX,
  SLUG: SLUG_REGEX,

  // Password
  PASSWORD_STRONG: PASSWORD_STRONG_REGEX,
  PASSWORD_MEDIUM: PASSWORD_MEDIUM_REGEX,
  PASSWORD_WEAK: PASSWORD_WEAK_REGEX,

  // Platform Usernames
  LEETCODE_USERNAME: LEETCODE_USERNAME_REGEX,
  GITHUB_USERNAME: GITHUB_USERNAME_REGEX,
  CODEFORCES_USERNAME: CODEFORCES_USERNAME_REGEX,

  // Code & Technical
  API_KEY: API_KEY_REGEX,
  JWT: JWT_REGEX,
  UUID: UUID_REGEX,
  SEMVER: SEMVER_REGEX,

  // Dates
  DATE_YYYY_MM_DD: DATE_YYYY_MM_DD_REGEX,
  TIME_24H: TIME_24H_REGEX,
  ISO_DATETIME: ISO_DATETIME_REGEX,

  // Numbers
  POSITIVE_INTEGER: POSITIVE_INTEGER_REGEX,
  DECIMAL: DECIMAL_REGEX,
  PERCENTAGE: PERCENTAGE_REGEX,

  // Files
  IMAGE_FILE: IMAGE_FILE_REGEX,
  DOCUMENT_FILE: DOCUMENT_FILE_REGEX,

  // Validation Functions
  isValidUsername,
  isValidEmail,
  isValidUrl,
  isValidPassword,
  getPasswordStrength,
  isValidSlug,
  isValidUUID,
  isValidHexColor,
  isValidIPv4,
  isValidIPv6,
  sanitizeInput,
  extractHashtags,
  extractMentions,
  extractUrls,
};

export default REGEX_EXPORT;