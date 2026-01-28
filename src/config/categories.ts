// ===== FILE: src/config/categories.ts =====
// Complete category configuration matching Prisma schema
// Database is the single source of truth for category enums

import type { PlatformCategory as PrismaPlatformCategory } from "@prisma/client";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Category configuration interface
 */
export interface CategoryConfig {
  value: PrismaPlatformCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  emoji: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  order: number;
  isActive: boolean;
}

/**
 * Category statistics interface
 */
export interface CategoryStats {
  total: number;
  autoSync: number;
  manual: number;
  oauth: number;
  api: number;
  scraping: number;
}

// =============================================================================
// MAIN CATEGORY CONFIGURATION
// =============================================================================

/**
 * IMPORTANT RULE:
 * ----------------
 * Platform categories MUST match Prisma enum values exactly.
 * Database is the single source of truth.
 *
 * Any new category must be added FIRST in:
 * prisma/schema.prisma -> enum PlatformCategory
 *
 * Prisma Enum Values:
 * - DSA, JOB, GIT, LEARNING, HACKATHON, OPENSOURCE, COMPANY, DESIGN, DATA_SCIENCE, OTHER
 */

export const PLATFORM_CATEGORIES: Record<PrismaPlatformCategory, CategoryConfig> = {
  DSA: {
    value: "DSA",
    label: "DSA & Competitive Programming",
    shortLabel: "DSA",
    description: "Coding practice, competitive programming, and algorithm challenges",
    icon: "Code",
    emoji: "💻",
    color: "#6366f1",
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
    gradientFrom: "#6366f1",
    gradientTo: "#8b5cf6",
    order: 1,
    isActive: true,
  },

  JOB: {
    value: "JOB",
    label: "Job Portals",
    shortLabel: "Jobs",
    description: "Job search, career platforms, and employment websites",
    icon: "Briefcase",
    emoji: "💼",
    color: "#10b981",
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    order: 2,
    isActive: true,
  },

  GIT: {
    value: "GIT",
    label: "Version Control",
    shortLabel: "Git",
    description: "Git repositories, version control, and code hosting platforms",
    icon: "GitBranch",
    emoji: "🔀",
    color: "#8b5cf6",
    backgroundColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    gradientFrom: "#8b5cf6",
    gradientTo: "#7c3aed",
    order: 3,
    isActive: true,
  },

  LEARNING: {
    value: "LEARNING",
    label: "Learning Platforms",
    shortLabel: "Learning",
    description: "Online courses, tutorials, and educational content",
    icon: "GraduationCap",
    emoji: "📚",
    color: "#ec4899",
    backgroundColor: "#fdf2f8",
    borderColor: "#fbcfe8",
    gradientFrom: "#ec4899",
    gradientTo: "#db2777",
    order: 4,
    isActive: true,
  },

  HACKATHON: {
    value: "HACKATHON",
    label: "Hackathons & Competitions",
    shortLabel: "Hackathons",
    description: "Hackathons, coding competitions, and tech challenges",
    icon: "Trophy",
    emoji: "🏆",
    color: "#f59e0b",
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    gradientFrom: "#f59e0b",
    gradientTo: "#d97706",
    order: 5,
    isActive: true,
  },

  OPENSOURCE: {
    value: "OPENSOURCE",
    label: "Open Source Programs",
    shortLabel: "Open Source",
    description: "Open source contribution programs and initiatives",
    icon: "Heart",
    emoji: "❤️",
    color: "#ef4444",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    gradientFrom: "#ef4444",
    gradientTo: "#dc2626",
    order: 6,
    isActive: true,
  },

  COMPANY: {
    value: "COMPANY",
    label: "Company Portals",
    shortLabel: "Companies",
    description: "Direct company career pages and job portals",
    icon: "Building",
    emoji: "🏢",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    gradientFrom: "#64748b",
    gradientTo: "#475569",
    order: 7,
    isActive: true,
  },

  DESIGN: {
    value: "DESIGN",
    label: "Design Platforms",
    shortLabel: "Design",
    description: "Design portfolios, creative tools, and UI/UX platforms",
    icon: "Palette",
    emoji: "🎨",
    color: "#f472b6",
    backgroundColor: "#fdf2f8",
    borderColor: "#f9a8d4",
    gradientFrom: "#f472b6",
    gradientTo: "#ec4899",
    order: 8,
    isActive: true,
  },

  DATA_SCIENCE: {
    value: "DATA_SCIENCE",
    label: "Data Science",
    shortLabel: "Data Science",
    description: "Data science, machine learning, and analytics platforms",
    icon: "BarChart",
    emoji: "📊",
    color: "#06b6d4",
    backgroundColor: "#ecfeff",
    borderColor: "#a5f3fc",
    gradientFrom: "#06b6d4",
    gradientTo: "#0891b2",
    order: 9,
    isActive: true,
  },

  OTHER: {
    value: "OTHER",
    label: "Other",
    shortLabel: "Other",
    description: "Other platforms and miscellaneous tools",
    icon: "MoreHorizontal",
    emoji: "🔗",
    color: "#6b7280",
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    gradientFrom: "#6b7280",
    gradientTo: "#4b5563",
    order: 10,
    isActive: true,
  },
} as const;

// =============================================================================
// DERIVED DATA
// =============================================================================

/** Array version of categories (sorted by order) */
export const PLATFORM_CATEGORY_LIST: CategoryConfig[] = Object.values(PLATFORM_CATEGORIES).sort(
  (a, b) => a.order - b.order
);

/** Active categories only */
export const ACTIVE_CATEGORIES: CategoryConfig[] = PLATFORM_CATEGORY_LIST.filter((c) => c.isActive);

/** Category values array (for validation) */
export const CATEGORY_VALUES: PrismaPlatformCategory[] = Object.keys(PLATFORM_CATEGORIES) as PrismaPlatformCategory[];

/** Category options for select/dropdown components */
export const CATEGORY_OPTIONS: Array<{ value: PrismaPlatformCategory; label: string }> = PLATFORM_CATEGORY_LIST.map(
  (c) => ({
    value: c.value,
    label: c.label,
  })
);

/** Category options with icons */
export const CATEGORY_OPTIONS_WITH_ICONS: Array<{
  value: PrismaPlatformCategory;
  label: string;
  icon: string;
  emoji: string;
  color: string;
}> = PLATFORM_CATEGORY_LIST.map((c) => ({
  value: c.value,
  label: c.label,
  icon: c.icon,
  emoji: c.emoji,
  color: c.color,
}));

// =============================================================================
// HELPER FUNCTIONS - BASIC GETTERS
// =============================================================================

/** Get category config by value */
export function getCategory(category: PrismaPlatformCategory): CategoryConfig {
  return PLATFORM_CATEGORIES[category];
}

/** Get category config or undefined */
export function getCategorySafe(category: string): CategoryConfig | undefined {
  return PLATFORM_CATEGORIES[category as PrismaPlatformCategory];
}

/** Check if value is a valid category */
export function isValidCategory(value: string): value is PrismaPlatformCategory {
  return value in PLATFORM_CATEGORIES;
}

/** Get category color */
export function getCategoryColor(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.color ?? "#6b7280";
}

/** Get category background color */
export function getCategoryBackgroundColor(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.backgroundColor ?? "#f9fafb";
}

/** Get category border color */
export function getCategoryBorderColor(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.borderColor ?? "#e5e7eb";
}

/** Get category label */
export function getCategoryLabel(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.label ?? "Unknown";
}

/** Get category short label */
export function getCategoryShortLabel(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.shortLabel ?? "Unknown";
}

/** Get category description */
export function getCategoryDescription(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.description ?? "";
}

/** Get category icon name */
export function getCategoryIcon(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.icon ?? "HelpCircle";
}

/** Get category emoji */
export function getCategoryEmoji(category: PrismaPlatformCategory): string {
  return PLATFORM_CATEGORIES[category]?.emoji ?? "🔗";
}

/** Get category order */
export function getCategoryOrder(category: PrismaPlatformCategory): number {
  return PLATFORM_CATEGORIES[category]?.order ?? 999;
}

/** Get category gradient */
export function getCategoryGradient(category: PrismaPlatformCategory): { from: string; to: string } {
  const config = PLATFORM_CATEGORIES[category];
  return {
    from: config?.gradientFrom ?? "#6b7280",
    to: config?.gradientTo ?? "#4b5563",
  };
}

/** Get category gradient CSS string */
export function getCategoryGradientCSS(category: PrismaPlatformCategory, direction: string = "to right"): string {
  const { from, to } = getCategoryGradient(category);
  return `linear-gradient(${direction}, ${from}, ${to})`;
}

// =============================================================================
// HELPER FUNCTIONS - SEARCH & FILTER
// =============================================================================

/** Find category by label (case-insensitive) */
export function findCategoryByLabel(label: string): CategoryConfig | undefined {
  const lowerLabel = label.toLowerCase();
  return PLATFORM_CATEGORY_LIST.find(
    (c) => c.label.toLowerCase() === lowerLabel || c.shortLabel.toLowerCase() === lowerLabel
  );
}

/** Search categories by keyword */
export function searchCategories(query: string): CategoryConfig[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return PLATFORM_CATEGORY_LIST;
  return PLATFORM_CATEGORY_LIST.filter(
    (c) =>
      c.label.toLowerCase().includes(lowerQuery) ||
      c.shortLabel.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery)
  );
}

/** Get categories by color (approximate match) */
export function getCategoriesByColor(color: string): CategoryConfig[] {
  return PLATFORM_CATEGORY_LIST.filter((c) => c.color.toLowerCase() === color.toLowerCase());
}

// =============================================================================
// HELPER FUNCTIONS - SORTING & ORDERING
// =============================================================================

/** Get categories sorted by order */
export function getCategoriesSorted(): CategoryConfig[] {
  return [...PLATFORM_CATEGORY_LIST].sort((a, b) => a.order - b.order);
}

/** Get categories sorted alphabetically */
export function getCategoriesAlphabetically(): CategoryConfig[] {
  return [...PLATFORM_CATEGORY_LIST].sort((a, b) => a.label.localeCompare(b.label));
}

/** Get category by order number */
export function getCategoryByOrder(order: number): CategoryConfig | undefined {
  return PLATFORM_CATEGORY_LIST.find((c) => c.order === order);
}

/** Get next category (by order) */
export function getNextCategory(category: PrismaPlatformCategory): CategoryConfig | undefined {
  const currentOrder = getCategoryOrder(category);
  return PLATFORM_CATEGORY_LIST.find((c) => c.order === currentOrder + 1);
}

/** Get previous category (by order) */
export function getPreviousCategory(category: PrismaPlatformCategory): CategoryConfig | undefined {
  const currentOrder = getCategoryOrder(category);
  return PLATFORM_CATEGORY_LIST.find((c) => c.order === currentOrder - 1);
}

// =============================================================================
// HELPER FUNCTIONS - DISPLAY & FORMATTING
// =============================================================================

/** Format category for display with emoji */
export function formatCategoryWithEmoji(category: PrismaPlatformCategory): string {
  const config = PLATFORM_CATEGORIES[category];
  return `${config?.emoji ?? "🔗"} ${config?.label ?? "Unknown"}`;
}

/** Format category for badge display */
export function formatCategoryBadge(category: PrismaPlatformCategory): {
  text: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  const config = PLATFORM_CATEGORIES[category];
  return {
    text: config?.shortLabel ?? "Other",
    color: config?.color ?? "#6b7280",
    backgroundColor: config?.backgroundColor ?? "#f9fafb",
    borderColor: config?.borderColor ?? "#e5e7eb",
  };
}

/** Get category CSS classes (Tailwind-style) */
export function getCategoryClasses(category: PrismaPlatformCategory): string {
  const colorMap: Record<string, string> = {
    "#6366f1": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "#10b981": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "#8b5cf6": "bg-violet-100 text-violet-800 border-violet-200",
    "#ec4899": "bg-pink-100 text-pink-800 border-pink-200",
    "#f59e0b": "bg-amber-100 text-amber-800 border-amber-200",
    "#ef4444": "bg-red-100 text-red-800 border-red-200",
    "#64748b": "bg-slate-100 text-slate-800 border-slate-200",
    "#f472b6": "bg-pink-100 text-pink-800 border-pink-200",
    "#06b6d4": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "#6b7280": "bg-gray-100 text-gray-800 border-gray-200",
  };
  const color = PLATFORM_CATEGORIES[category]?.color;
  return colorMap[color ?? ""] ?? "bg-gray-100 text-gray-800 border-gray-200";
}

/** Get category style object (for inline styles) */
export function getCategoryStyle(category: PrismaPlatformCategory): React.CSSProperties {
  const config = PLATFORM_CATEGORIES[category];
  return {
    color: config?.color,
    backgroundColor: config?.backgroundColor,
    borderColor: config?.borderColor,
  };
}

// =============================================================================
// HELPER FUNCTIONS - VALIDATION
// =============================================================================

/** Validate category value */
export function validateCategory(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== "string") {
    return { valid: false, error: "Category must be a string" };
  }
  if (!isValidCategory(value)) {
    return { valid: false, error: `Invalid category: ${value}. Valid values: ${CATEGORY_VALUES.join(", ")}` };
  }
  return { valid: true };
}

/** Parse category from string (with fallback) */
export function parseCategory(value: string, fallback: PrismaPlatformCategory = "OTHER"): PrismaPlatformCategory {
  const upper = value.toUpperCase();
  return isValidCategory(upper) ? (upper as PrismaPlatformCategory) : fallback;
}

// =============================================================================
// HELPER FUNCTIONS - CONVERSION
// =============================================================================

/** Convert lowercase category to Prisma enum */
export function toPrismaCategory(category: string): PrismaPlatformCategory {
  const upper = category.toUpperCase().replace(/-/g, "_");
  return isValidCategory(upper) ? (upper as PrismaPlatformCategory) : "OTHER";
}

/** Convert Prisma enum to lowercase slug */
export function toCategorySlug(category: PrismaPlatformCategory): string {
  return category.toLowerCase().replace(/_/g, "-");
}

/** Get category from slug */
export function getCategoryFromSlug(slug: string): PrismaPlatformCategory {
  return toPrismaCategory(slug);
}

// =============================================================================
// CATEGORY COUNTS (computed at runtime)
// =============================================================================

/** Get category count (requires platforms array to be passed) */
export function getCategoryCount<T extends { category: string }>(
  platforms: T[],
  category: PrismaPlatformCategory
): number {
  return platforms.filter((p) => p.category === category || p.category === category.toLowerCase()).length;
}

/** Get all category counts */
export function getAllCategoryCounts<T extends { category: string }>(
  platforms: T[]
): Record<PrismaPlatformCategory, number> {
  const counts = {} as Record<PrismaPlatformCategory, number>;
  CATEGORY_VALUES.forEach((cat) => {
    counts[cat] = getCategoryCount(platforms, cat);
  });
  return counts;
}

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================

/**
 * This module exports:
 *
 * CONSTANTS:
 * - PLATFORM_CATEGORIES: Main category configuration object
 * - PLATFORM_CATEGORY_LIST: Array of all categories (sorted by order)
 * - ACTIVE_CATEGORIES: Array of active categories only
 * - CATEGORY_VALUES: Array of category enum values
 * - CATEGORY_OPTIONS: Options for select components
 * - CATEGORY_OPTIONS_WITH_ICONS: Options with icons for rich selects
 *
 * BASIC GETTERS:
 * - getCategory, getCategorySafe, isValidCategory
 * - getCategoryColor, getCategoryBackgroundColor, getCategoryBorderColor
 * - getCategoryLabel, getCategoryShortLabel, getCategoryDescription
 * - getCategoryIcon, getCategoryEmoji, getCategoryOrder
 * - getCategoryGradient, getCategoryGradientCSS
 *
 * SEARCH & FILTER:
 * - findCategoryByLabel, searchCategories, getCategoriesByColor
 *
 * SORTING & ORDERING:
 * - getCategoriesSorted, getCategoriesAlphabetically
 * - getCategoryByOrder, getNextCategory, getPreviousCategory
 *
 * DISPLAY & FORMATTING:
 * - formatCategoryWithEmoji, formatCategoryBadge
 * - getCategoryClasses, getCategoryStyle
 *
 * VALIDATION:
 * - validateCategory, parseCategory
 *
 * CONVERSION:
 * - toPrismaCategory, toCategorySlug, getCategoryFromSlug
 *
 * COUNTS:
 * - getCategoryCount, getAllCategoryCounts
 */

export default PLATFORM_CATEGORIES;