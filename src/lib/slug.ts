/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: lib/slug.ts
// PURPOSE: Slug generation utilities
// ============================================================================

import { customAlphabet } from 'nanoid';


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SlugifyOptions {
  lowercase?: boolean;
  separator?: '-' | '_';
  maxLength?: number;
  removeStopWords?: boolean;
  strict?: boolean;
  transliterate?: boolean;
  trim?: boolean;
  allowedChars?: string;
}

export interface UniqueSlugOptions extends SlugifyOptions {
  suffix?: 'random' | 'increment';
  suffixLength?: number;
  maxAttempts?: number;
}

export interface SlugValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common English stop words to remove (optional)
 */
const STOP_WORDS = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by',
  'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'to', 'was', 'will', 'with',
];

/**
 * Character transliteration map for common accented characters
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
  'ç': 'c',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ñ': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'œ': 'oe',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ß': 'ss',
  // Add uppercase versions
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
  'Ç': 'C',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  'Ñ': 'N',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Œ': 'OE',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
  'Ý': 'Y',
};

/**
 * Default slug options
 */
const DEFAULT_OPTIONS: Required<SlugifyOptions> = {
  lowercase: true,
  separator: '-',
  maxLength: 200,
  removeStopWords: false,
  strict: true,
  transliterate: true,
  trim: true,
  allowedChars: 'a-z0-9',
};

/**
 * Minimum and maximum slug length
 */
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 200;

/**
 * Reserved slugs that should not be used
 */
const RESERVED_SLUGS = [
  'admin', 'api', 'auth', 'login', 'logout', 'register', 'signup',
  'settings', 'profile', 'dashboard', 'new', 'edit', 'delete',
  'create', 'update', 'remove', 'search', 'about', 'contact',
  'help', 'terms', 'privacy', 'tos', 'faq', 'blog', 'post',
  'page', 'user', 'users', 'account', 'accounts', 'null', 'undefined',
];

// ============================================================================
// NANOID GENERATORS
// ============================================================================

/**
 * Generate random suffix (alphanumeric, lowercase)
 */
const generateRandomId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

/**
 * Generate short random suffix
 */
const generateShortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Basic slug generation from text
 * 
 * @param text - Text to convert to slug
 * @returns Basic slug
 * 
 * @example
 * ```ts
 * const slug = generateSlug('Hello World!');
 * // Returns: 'hello-world'
 * ```
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return slugify(text, DEFAULT_OPTIONS);
}

/**
 * Advanced slug generation with options
 * 
 * @param text - Text to slugify
 * @param options - Slugify options
 * @returns Slugified text
 * 
 * @example
 * ```ts
 * const slug = slugify('How to Learn TypeScript', {
 *   maxLength: 30,
 *   removeStopWords: true
 * });
 * // Returns: 'learn-typescript'
 * ```
 */
export function slugify(text: string, options: SlugifyOptions = {}): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let slug = text;

  // Step 1: Transliterate special characters
  if (opts.transliterate) {
    slug = transliterate(slug);
  }

  // Step 2: Convert to lowercase
  if (opts.lowercase) {
    slug = slug.toLowerCase();
  }

  // Step 3: Trim whitespace
  if (opts.trim) {
    slug = slug.trim();
  }

  // Step 4: Remove stop words
  if (opts.removeStopWords) {
    slug = removeStopWords(slug, opts.separator);
  }

  // Step 5: Replace spaces and special characters with separator
  slug = slug.replace(/[\s\W-]+/g, opts.separator);

  // Step 6: Remove multiple consecutive separators
  const separatorRegex = new RegExp(`${opts.separator}{2,}`, 'g');
  slug = slug.replace(separatorRegex, opts.separator);

  // Step 7: Remove leading/trailing separators
  const trimRegex = new RegExp(`^${opts.separator}+|${opts.separator}+$`, 'g');
  slug = slug.replace(trimRegex, '');

  // Step 8: Apply strict mode (only allowed characters)
  if (opts.strict) {
    const allowedRegex = new RegExp(`[^${opts.allowedChars}${opts.separator}]`, 'g');
    slug = slug.replace(allowedRegex, '');
  }

  // Step 9: Truncate to max length
  if (opts.maxLength && slug.length > opts.maxLength) {
    slug = slug.substring(0, opts.maxLength);
    // Remove trailing separator after truncation
    slug = slug.replace(new RegExp(`${opts.separator}+$`), '');
  }

  return slug;
}

/**
 * Generate unique slug by checking existence
 * 
 * @param text - Text to slugify
 * @param existingCheck - Async function to check if slug exists
 * @param options - Unique slug options
 * @returns Promise resolving to unique slug
 * 
 * @example
 * ```ts
 * const slug = await generateUniqueSlug(
 *   'My Blog Post',
 *   async (slug) => {
 *     const existing = await prisma.blogPost.findUnique({ where: { slug } });
 *     return !!existing;
 *   }
 * );
 * ```
 */
export async function generateUniqueSlug(
  text: string,
  existingCheck: (slug: string) => Promise<boolean>,
  options: UniqueSlugOptions = {}
): Promise<string> {
  const {
    suffix = 'random',
    suffixLength = 4,
    maxAttempts = 10,
    ...slugOptions
  } = options;

  // Generate base slug
  const baseSlug = slugify(text, slugOptions);

  // Check if base slug is available
  const baseExists = await existingCheck(baseSlug);
  if (!baseExists) {
    return baseSlug;
  }

  // Try with suffixes
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let candidateSlug: string;

    if (suffix === 'increment') {
      candidateSlug = `${baseSlug}-${attempt}`;
    } else {
      const randomSuffix = customAlphabet(
        '0123456789abcdefghijklmnopqrstuvwxyz',
        suffixLength
      )();
      candidateSlug = `${baseSlug}-${randomSuffix}`;
    }

    const exists = await existingCheck(candidateSlug);
    if (!exists) {
      return candidateSlug;
    }
  }

  // Fallback: use timestamp + random
  const timestamp = Date.now().toString(36);
  const random = generateShortId();
  return `${baseSlug}-${timestamp}-${random}`;
}

/**
 * Validate slug format
 * 
 * @param slug - Slug to validate
 * @param strict - Enable strict validation
 * @returns Validation result
 * 
 * @example
 * ```ts
 * const result = isValidSlug('my-blog-post');
 * // Returns: true
 * 
 * const result2 = isValidSlug('invalid slug!');
 * // Returns: false
 * ```
 */
export function isValidSlug(slug: string, strict: boolean = true): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Length check
  if (slug.length < MIN_SLUG_LENGTH || slug.length > MAX_SLUG_LENGTH) {
    return false;
  }

  // Basic format check
  const basicRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!basicRegex.test(slug)) {
    return false;
  }

  // Strict mode: additional checks
  if (strict) {
    // No reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      return false;
    }

    // No all-numeric slugs
    if (/^\d+$/.test(slug)) {
      return false;
    }

    // No single character slugs
    if (slug.length === 1) {
      return false;
    }
  }

  return true;
}

/**
 * Validate slug with detailed error messages
 * 
 * @param slug - Slug to validate
 * @param strict - Enable strict validation
 * @returns Validation result with errors
 */
export function validateSlug(slug: string, strict: boolean = true): SlugValidationResult {
  const errors: string[] = [];

  if (!slug || typeof slug !== 'string') {
    return {
      valid: false,
      errors: ['Slug is required and must be a string'],
    };
  }

  // Length validation
  if (slug.length < MIN_SLUG_LENGTH) {
    errors.push(`Slug must be at least ${MIN_SLUG_LENGTH} characters long`);
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    errors.push(`Slug must not exceed ${MAX_SLUG_LENGTH} characters`);
  }

  // Format validation
  const formatRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!formatRegex.test(slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push('Slug cannot start or end with a hyphen');
  }

  // Check for consecutive hyphens
  if (/--/.test(slug)) {
    errors.push('Slug cannot contain consecutive hyphens');
  }

  if (strict) {
    // Reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      errors.push('This slug is reserved and cannot be used');
    }

    // All numeric
    if (/^\d+$/.test(slug)) {
      errors.push('Slug cannot be all numbers');
    }

    // Single character
    if (slug.length === 1) {
      errors.push('Slug must be more than one character');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? slug : normalizeSlug(slug),
  };
}

/**
 * Normalize slug to valid format
 * 
 * @param slug - Slug to normalize
 * @returns Normalized slug
 * 
 * @example
 * ```ts
 * const normalized = normalizeSlug('Invalid--Slug-!');
 * // Returns: 'invalid-slug'
 * ```
 */
export function normalizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slugify(slug, {
    ...DEFAULT_OPTIONS,
    strict: true,
  });
}

/**
 * Append random suffix to slug
 * 
 * @param slug - Base slug
 * @param length - Length of random suffix
 * @returns Slug with random suffix
 * 
 * @example
 * ```ts
 * const slugWithSuffix = appendRandomSuffix('my-post');
 * // Returns: 'my-post-a1b2c3d4'
 * 
 * const shortSuffix = appendRandomSuffix('my-post', 4);
 * // Returns: 'my-post-x9y8'
 * ```
 */
export function appendRandomSuffix(slug: string, length: number = 8): string {
  if (!slug) {
    return generateRandomId();
  }

  const suffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', length)();
  return `${slug}-${suffix}`;
}

/**
 * Append numeric suffix to slug
 * 
 * @param slug - Base slug
 * @param number - Number to append
 * @returns Slug with numeric suffix
 * 
 * @example
 * ```ts
 * const numbered = appendNumericSuffix('my-post', 2);
 * // Returns: 'my-post-2'
 * ```
 */
export function appendNumericSuffix(slug: string, number: number): string {
  return `${slug}-${number}`;
}

/**
 * Remove suffix from slug (if present)
 * 
 * @param slug - Slug with potential suffix
 * @returns Slug without suffix
 * 
 * @example
 * ```ts
 * const base = removeSlugSuffix('my-post-abc123');
 * // Returns: 'my-post'
 * ```
 */
export function removeSlugSuffix(slug: string): string {
  // Remove trailing random alphanumeric suffix (e.g., -abc123)
  return slug.replace(/-[a-z0-9]{4,}$/i, '');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transliterate special characters to ASCII
 */
function transliterate(text: string): string {
  let result = text;

  // Apply character map
  for (const [char, replacement] of Object.entries(TRANSLITERATION_MAP)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }

  return result;
}

/**
 * Remove common stop words from text
 */
function removeStopWords(text: string, separator: string = '-'): string {
  const words = text.split(/[\s-]+/);

  const filtered = words.filter((word) => {
    const lower = word.toLowerCase();
    return !STOP_WORDS.includes(lower) || word.length <= 2;
  });

  return filtered.join(separator);
}

/**
 * Extract slug from URL or path
 * 
 * @param url - URL or path containing slug
 * @returns Extracted slug
 * 
 * @example
 * ```ts
 * const slug = extractSlugFromUrl('/blog/my-awesome-post');
 * // Returns: 'my-awesome-post'
 * ```
 */
export function extractSlugFromUrl(url: string): string {
  if (!url) return '';

  // Remove protocol and domain
  let path = url.replace(/^https?:\/\/[^/]+/, '');

  // Remove query string and hash
  path = path.split('?')[0].split('#')[0];

  // Get last segment
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';

  // Remove file extension if present
  return lastSegment.replace(/\.[^.]+$/, '');
}

/**
 * Check if slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Generate slug from title with automatic truncation
 * 
 * @param title - Title to convert
 * @param maxWords - Maximum number of words to include
 * @returns Generated slug
 */
export function generateSlugFromTitle(title: string, maxWords: number = 10): string {
  const words = title.trim().split(/\s+/).slice(0, maxWords);
  const truncated = words.join(' ');
  return slugify(truncated, { removeStopWords: true });
}

/**
 * Create SEO-friendly slug with category prefix
 * 
 * @param title - Title
 * @param category - Category slug
 * @returns Slug with category prefix
 */
export function generateCategorizedSlug(title: string, category: string): string {
  const titleSlug = slugify(title);
  const categorySlug = slugify(category);
  return `${categorySlug}-${titleSlug}`;
}

/**
 * Create date-prefixed slug
 * 
 * @param title - Title
 * @param date - Date object
 * @returns Date-prefixed slug
 * 
 * @example
 * ```ts
 * const slug = generateDatePrefixedSlug('My Post', new Date('2024-01-15'));
 * // Returns: '2024-01-15-my-post'
 * ```
 */
export function generateDatePrefixedSlug(title: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const titleSlug = slugify(title);
  return `${dateStr}-${titleSlug}`;
}

/**
 * Suggest alternative slugs
 * 
 * @param text - Original text
 * @param count - Number of suggestions
 * @returns Array of suggested slugs
 */
export function suggestSlugs(text: string, count: number = 5): string[] {
  const suggestions: string[] = [];
  const baseSlug = slugify(text);

  // Add base slug
  suggestions.push(baseSlug);

  // Add version without stop words
  const withoutStopWords = slugify(text, { removeStopWords: true });
  if (withoutStopWords !== baseSlug) {
    suggestions.push(withoutStopWords);
  }

  // Add truncated versions
  const words = text.split(/\s+/);
  if (words.length > 5) {
    suggestions.push(slugify(words.slice(0, 5).join(' ')));
  }
  if (words.length > 3) {
    suggestions.push(slugify(words.slice(0, 3).join(' ')));
  }

  // Fill remaining with random suffixes
  while (suggestions.length < count) {
    suggestions.push(appendRandomSuffix(baseSlug, 4));
  }

  // Return unique suggestions
  return [...new Set(suggestions)].slice(0, count);
}

/**
 * Compare two slugs for similarity
 * 
 * @param slug1 - First slug
 * @param slug2 - Second slug
 * @returns Similarity score (0-1)
 */
export function slugSimilarity(slug1: string, slug2: string): number {
  if (slug1 === slug2) return 1;

  const set1 = new Set(slug1.split('-'));
  const set2 = new Set(slug2.split('-'));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Generate slugs for multiple items
 * 
 * @param items - Array of items with text to slugify
 * @param textKey - Key to extract text from items
 * @returns Array of items with slugs added
 */
export function bulkGenerateSlugs<T extends Record<string, any>>(
  items: T[],
  textKey: keyof T
): Array<T & { slug: string }> {
  return items.map((item) => ({
    ...item,
    slug: generateSlug(String(item[textKey])),
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

const slug ={
  // Core functions
  generateSlug,
  slugify,
  generateUniqueSlug,
  isValidSlug,
  validateSlug,
  normalizeSlug,
  
  // Suffix operations
  appendRandomSuffix,
  appendNumericSuffix,
  removeSlugSuffix,
  
  // Utility functions
  extractSlugFromUrl,
  isReservedSlug,
  generateSlugFromTitle,
  generateCategorizedSlug,
  generateDatePrefixedSlug,
  suggestSlugs,
  slugSimilarity,
  bulkGenerateSlugs,
  
  // Constants
  RESERVED_SLUGS,
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
}; 

export default slug;