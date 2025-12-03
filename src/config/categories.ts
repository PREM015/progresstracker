// src/config/categories.ts

export const PLATFORM_CATEGORIES = [
  { value: 'dsa', label: 'DSA Practice', color: '#3b82f6' },
  { value: 'development', label: 'Development', color: '#10b981' },
  { value: 'jobs', label: 'Job Search', color: '#f59e0b' },
  { value: 'learning', label: 'Learning', color: '#8b5cf6' },
  { value: 'design', label: 'Design', color: '#ec4899' },
  { value: 'hackathons', label: 'Hackathons', color: '#ef4444' },
  { value: 'opensource', label: 'Open Source', color: '#06b6d4' },
] as const;

export type PlatformCategory = typeof PLATFORM_CATEGORIES[number]['value'];

export function getCategoryColor(category: string): string {
  const found = PLATFORM_CATEGORIES.find((c) => c.value === category);
  return found?.color || '#6b7280';
}

export function getCategoryLabel(category: string): string {
  const found = PLATFORM_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}