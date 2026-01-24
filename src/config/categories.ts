// src/config/categories.ts

/**
 * IMPORTANT RULE:
 * ----------------
 * Platform categories MUST match Prisma enum values exactly.
 * Database is the single source of truth.
 *
 * Any new category must be added FIRST in:
 * prisma/schema.prisma -> enum PlatformCategory
 */

import type { PlatformCategory } from "@/generated/prisma";

/**
 * Canonical category configuration
 * Key = Prisma enum value
 */
export const PLATFORM_CATEGORIES: Record<
  PlatformCategory,
  {
    value: PlatformCategory;
    label: string;
    color: string;
  }
> = {
  DSA: {
    value: "DSA",
    label: "DSA Practice",
    color: "#3b82f6",
  },

  JOB: {
    value: "JOB",
    label: "Job Search",
    color: "#f59e0b",
  },

  GIT: {
    value: "GIT",
    label: "Open Source / Git",
    color: "#06b6d4",
  },

  LEARNING: {
    value: "LEARNING",
    label: "Learning",
    color: "#8b5cf6",
  },

  HACKATHON: {
    value: "HACKATHON",
    label: "Hackathons",
    color: "#ef4444",
  },

  OTHER: {
    value: "OTHER",
    label: "Other",
    color: "#6b7280",
  },
} as const;

/**
 * Array version (useful for dropdowns, filters, UI loops)
 */
export const PLATFORM_CATEGORY_LIST = Object.values(PLATFORM_CATEGORIES);

/**
 * Get category color safely
 */
export function getCategoryColor(category: PlatformCategory): string {
  return PLATFORM_CATEGORIES[category].color;
}

/**
 * Get category label safely
 */
export function getCategoryLabel(category: PlatformCategory): string {
  return PLATFORM_CATEGORIES[category].label;
}
