// ============================================================================
// FILE: src/lib/sanitize.ts
// PURPOSE: Input sanitization utilities
// ============================================================================

import DOMPurify from 'isomorphic-dompurify';
import { URL } from 'url';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  allowedClasses?: Record<string, string[]>;
  allowDataAttributes?: boolean;
  maxLength?: number;
  stripComments?: boolean;
  transformTags?: Record<string, string | ((tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> })>;
}

export interface UrlSanitizeOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  removeQueryParams?: boolean;
  removeHash?: boolean;
}

export interface FilenameSanitizeOptions {
  maxLength?: number;
  allowedExtensions?: string[];
  replaceSpaces?: boolean;
  lowercase?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default allowed HTML tags for rich text content
 */
export const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
];

/**
 * Default allowed HTML attributes
 */
export const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'id'],
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'code': ['class'], // For syntax highlighting
  'pre': ['class'],
  'div': ['class', 'style'],
  'span': ['class', 'style'],
  'table': ['class'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan'],
};

/**
 * Allowed URL schemes
 */
export const DEFAULT_ALLOWED_SCHEMES = [
  'http',
  'https',
  'mailto',
  'tel',
  'ftp',
];

/**
 * Dangerous patterns to remove
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /on\w+\s*=/gi, // Event handlers
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(--|;|\/\*|\*\/|xp_|sp_)/gi,
  /('|(\\')|(;)|(<)|(>)|("))/gi,
];

/**
 * XSS patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,
];

// ============================================================================
// CORE SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize HTML content with DOMPurify
 * 
 * @param html - HTML string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 * 
 * @example
 * ```ts
 * const clean = sanitizeHtml('<p>Hello <script>alert("xss")</script></p>');
 * // Returns: '<p>Hello </p>'
 * ```
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    allowedSchemes = DEFAULT_ALLOWED_SCHEMES,
    allowDataAttributes = false,
    maxLength,
    stripComments = true,
  } = options;

  // Truncate if maxLength is specified
  let content = maxLength && html.length > maxLength
    ? html.substring(0, maxLength)
    : html;

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: Object.values(allowedAttributes).flat(),
    ALLOWED_URI_REGEXP: new RegExp(`^(${allowedSchemes.join('|')}):`, 'i'),
    ALLOW_DATA_ATTR: allowDataAttributes,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    IN_PLACE: false,
  };

  if (stripComments) {
    // @ts-expect-error - DOMPurify types might not include all options
    config.ALLOW_UNKNOWN_PROTOCOLS = false;
  }

  // Hook to enforce rel="noopener noreferrer" for external links
  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      // If href is external, enforce secure target and rel
      if (href && /^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  // Sanitize with DOMPurify
  content = DOMPurify.sanitize(content, config);

  // Clean up hook to prevent bleeding into other DOMPurify calls
  DOMPurify.removeHook('afterSanitizeAttributes');

  // Additional pattern-based cleaning
  DANGEROUS_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content.trim();
}

/**
 * Sanitize plain text input
 * 
 * @param text - Text to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized text
 * 
 * @example
 * ```ts
 * const clean = sanitizeText('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 * ```
 */
export function sanitizeText(text: string, maxLength?: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove all HTML tags
  let sanitized = stripHtmlTags(text);

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Truncate if needed
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 * 
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 * 
 * @example
 * ```ts
 * const clean = sanitizeEmail('  User@Example.COM  ');
 * // Returns: 'user@example.com'
 * ```
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remove whitespace and convert to lowercase
  let sanitized = email.trim().toLowerCase();

  // Remove any HTML tags
  sanitized = stripHtmlTags(sanitized);

  // Basic email validation
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  if (!emailRegex.test(sanitized)) {
    return '';
  }

  // Additional security: remove potential SQL injection
  if (SQL_INJECTION_PATTERNS.some(pattern => pattern.test(sanitized))) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize URL
 * 
 * @param url - URL to sanitize
 * @param options - URL sanitization options
 * @returns Sanitized URL or null if invalid
 * 
 * @example
 * ```ts
 * const clean = sanitizeUrl('javascript:alert("xss")');
 * // Returns: null
 * 
 * const clean2 = sanitizeUrl('https://example.com/page?param=value');
 * // Returns: 'https://example.com/page?param=value'
 * ```
 */
export function sanitizeUrl(
  url: string,
  options: UrlSanitizeOptions = {}
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const {
    allowedProtocols = ['http', 'https', 'mailto', 'tel'],
    allowedDomains,
    removeQueryParams = false,
    removeHash = false,
  } = options;

  try {
    // Remove whitespace and HTML tags
    const sanitized = stripHtmlTags(url.trim());

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(proto => sanitized.toLowerCase().startsWith(proto))) {
      return null;
    }

    // Parse URL
    const parsedUrl = new URL(sanitized);

    // Check protocol
    const protocol = parsedUrl.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      return null;
    }

    // Check domain if whitelist provided
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return null;
      }
    }

    // Remove query params if requested
    if (removeQueryParams) {
      parsedUrl.search = '';
    }

    // Remove hash if requested
    if (removeHash) {
      parsedUrl.hash = '';
    }

    return parsedUrl.toString();
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Sanitize username
 * 
 * @param username - Username to sanitize
 * @returns Sanitized username
 * 
 * @example
 * ```ts
 * const clean = sanitizeUsername('User Name 123!@#');
 * // Returns: 'username123'
 * ```
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = stripHtmlTags(username);

  // Convert to lowercase and trim
  sanitized = sanitized.toLowerCase().trim();

  // Remove special characters, keep only alphanumeric, underscore, hyphen
  sanitized = sanitized.replace(/[^a-z0-9_-]/g, '');

  // Remove leading/trailing hyphens and underscores
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  // Collapse multiple hyphens/underscores
  sanitized = sanitized.replace(/[-_]{2,}/g, '-');

  // Limit length (3-20 characters is common)
  if (sanitized.length < 3) {
    return '';
  }
  if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20);
  }

  return sanitized;
}

/**
 * Sanitize filename
 * 
 * @param filename - Filename to sanitize
 * @param options - Filename sanitization options
 * @returns Sanitized filename
 * 
 * @example
 * ```ts
 * const clean = sanitizeFilename('../../../etc/passwd');
 * // Returns: 'etc-passwd'
 * 
 * const clean2 = sanitizeFilename('My Document.pdf', { replaceSpaces: true });
 * // Returns: 'my-document.pdf'
 * ```
 */
export function sanitizeFilename(
  filename: string,
  options: FilenameSanitizeOptions = {}
): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const {
    maxLength = 255,
    allowedExtensions,
    replaceSpaces = true,
    lowercase = true,
  } = options;

  // Remove path separators and dangerous characters
  let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '');

  // Remove hidden file prefix
  sanitized = sanitized.replace(/^\./g, '');

  // Remove HTML tags
  sanitized = stripHtmlTags(sanitized);

  // Handle spaces
  if (replaceSpaces) {
    sanitized = sanitized.replace(/\s+/g, '-');
  }

  // Convert to lowercase if requested
  if (lowercase) {
    sanitized = sanitized.toLowerCase();
  }

  // Remove special characters
  sanitized = sanitized.replace(/[^\w\s.-]/g, '');

  // Collapse multiple dots/hyphens
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  sanitized = sanitized.replace(/-{2,}/g, '-');

  // Check extension if whitelist provided
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = sanitized.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return '';
    }
  }

  // Truncate to max length while preserving extension
  if (sanitized.length > maxLength) {
    const parts = sanitized.split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : '';
    const name = parts.join('.');
    const maxNameLength = maxLength - ext.length;
    sanitized = name.substring(0, maxNameLength) + ext;
  }

  return sanitized.trim();
}

// ============================================================================
// HTML MANIPULATION FUNCTIONS
// ============================================================================

/**
 * Strip all HTML tags from string
 * 
 * @param html - HTML string
 * @returns Plain text without HTML tags
 * 
 * @example
 * ```ts
 * const text = stripHtmlTags('<p>Hello <strong>World</strong></p>');
 * // Returns: 'Hello World'
 * ```
 */
export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First pass: Use DOMPurify to strip everything
  const stripped = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });

  // Second pass: Remove any remaining tags
  return stripped
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns Escaped HTML
 * 
 * @example
 * ```ts
 * const escaped = escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, char => htmlEscapeMap[char] || char);
}

/**
 * Unescape HTML entities
 * 
 * @param html - HTML with entities
 * @returns Unescaped text
 * 
 * @example
 * ```ts
 * const unescaped = unescapeHtml('&lt;p&gt;Hello&lt;/p&gt;');
 * // Returns: '<p>Hello</p>'
 * ```
 */
export function unescapeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#x2F;': '/',
  };

  return html.replace(/&[#\w]+;/g, entity => htmlUnescapeMap[entity] || entity);
}

/**
 * Remove script tags and event handlers
 * 
 * @param html - HTML string
 * @returns HTML without scripts
 * 
 * @example
 * ```ts
 * const clean = removeScripts('<p onclick="alert()">Text</p><script>alert()</script>');
 * // Returns: '<p>Text</p>'
 * ```
 */
export function removeScripts(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let cleaned = html;

  // Remove script tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  return cleaned;
}

// ============================================================================
// SPECIALIZED SANITIZATION
// ============================================================================

/**
 * Sanitize JSON string (prevent injection)
 * 
 * @param jsonString - JSON string to sanitize
 * @returns Sanitized JSON string or null if invalid
 */
export function sanitizeJson(jsonString: string): string | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

/**
 * Sanitize search query
 * 
 * @param query - Search query
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Remove HTML
  let sanitized = stripHtmlTags(query);

  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Sanitize slug for URLs
 * 
 * @param slug - Slug to sanitize
 * @returns Sanitized slug
 */
export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitize phone number
 * 
 * @param phone - Phone number
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except + at start
  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

/**
 * Sanitize markdown content
 * 
 * @param markdown - Markdown content
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Remove potential XSS in markdown
  let sanitized = markdown;

  // Remove script tags
  sanitized = removeScripts(sanitized);

  // Remove dangerous markdown links
  sanitized = sanitized.replace(/\[([^\]]+)\]\(javascript:[^\)]*\)/gi, '[$1](#)');
  sanitized = sanitized.replace(/\[([^\]]+)\]\(data:[^\)]*\)/gi, '[$1](#)');

  return sanitized;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if string contains XSS patterns
 * 
 * @param input - Input to check
 * @returns True if XSS detected
 */
export function containsXss(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if string contains SQL injection patterns
 * 
 * @param input - Input to check
 * @returns True if SQL injection detected
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize object recursively
 * 
 * @param obj - Object to sanitize
 * @param sanitizer - Sanitizer function
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sanitizer: (value: string) => string = sanitizeText
): T {
  const result = { ...obj };

  for (const key in result) {
    // Prototype pollution protection
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete result[key];
      continue;
    }

    const value = result[key];

    if (typeof value === 'string') {
      result[key] = sanitizer(value) as T[Extract<keyof T, string>];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, sanitizer) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizer(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>, sanitizer)
            : item
      ) as T[Extract<keyof T, string>];
    }
  }

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

const sanitize = {
  // Core functions
  sanitizeHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeUsername,
  sanitizeFilename,

  // HTML manipulation
  stripHtmlTags,
  escapeHtml,
  unescapeHtml,
  removeScripts,

  // Specialized
  sanitizeJson,
  sanitizeSearchQuery,
  sanitizeSlug,
  sanitizePhone,
  sanitizeMarkdown,

  // Validation
  containsXss,
  containsSqlInjection,
  sanitizeObject,

  // Constants
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRIBUTES,
  DEFAULT_ALLOWED_SCHEMES,
};

export default sanitize;