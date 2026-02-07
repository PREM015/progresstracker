// ============================================================================
// FILE: types/changelog.ts
// PURPOSE: Changelog-related type definitions
// ============================================================================

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Changelog entry type (main category) */
export type ChangelogEntryType = 'feature' | 'improvement' | 'bugfix' | 'security';

/** Change item type (specific change) */
export type ChangeType = 
  | 'added' 
  | 'changed' 
  | 'deprecated' 
  | 'removed' 
  | 'fixed' 
  | 'security';

/** Changelog status */
export type ChangelogStatus = 'draft' | 'published';

/** Semantic versioning parts */
export type VersionBump = 'major' | 'minor' | 'patch';

/** Version type based on SemVer */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Individual change item */
export interface ChangelogChange {
  type: ChangeType;
  description: string;
  issueNumber?: string;
  pullRequestNumber?: string;
  commitHash?: string;
  author?: string;
  breaking?: boolean;
  component?: string;
}

/** Changelog entry (matches Prisma ChangelogEntry model) */
export interface ChangelogEntry {
  id: string;
  
  // Version info
  version: string;
  title: string;
  description: string;
  
  // Type
  type: ChangelogEntryType;
  
  // Content - array of changes
  changes: ChangelogChange[];
  
  // Status
  isPublished: boolean;
  publishedAt?: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Changelog entry for display */
export interface ChangelogEntryDisplay extends ChangelogEntry {
  formattedDate: string;
  relativeDate: string;
  changesByType: Record<ChangeType, ChangelogChange[]>;
  breakingChanges: ChangelogChange[];
  hasBreakingChanges: boolean;
  totalChanges: number;
  versionParsed: SemanticVersion | null;
  isLatest: boolean;
}

/** Changelog summary (for lists) */
export interface ChangelogSummary {
  id: string;
  version: string;
  title: string;
  type: ChangelogEntryType;
  publishedAt?: Date | null;
  totalChanges: number;
  hasBreakingChanges: boolean;
  isLatest: boolean;
}

/** Changelog statistics */
export interface ChangelogStats {
  totalEntries: number;
  publishedEntries: number;
  draftEntries: number;
  totalChanges: number;
  breakingChanges: number;
  byType: Record<ChangelogEntryType, number>;
  byChangeType: Record<ChangeType, number>;
  latestVersion: string | null;
  latestPublishedAt: Date | null;
  versionsThisMonth: number;
  versionsThisYear: number;
}

/** Version comparison result */
export interface VersionComparison {
  current: string;
  previous: string;
  isNewer: boolean;
  isOlder: boolean;
  isSame: boolean;
  bump: VersionBump | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create changelog input */
export interface CreateChangelogInput {
  version: string;
  title: string;
  description: string;
  type: ChangelogEntryType;
  changes: Array<{
    type: ChangeType;
    description: string;
    issueNumber?: string;
    pullRequestNumber?: string;
    breaking?: boolean;
  }>;
  isPublished?: boolean;
}

/** Update changelog input */
export interface UpdateChangelogInput {
  version?: string;
  title?: string;
  description?: string;
  type?: ChangelogEntryType;
  changes?: Array<{
    type: ChangeType;
    description: string;
    issueNumber?: string;
    pullRequestNumber?: string;
    breaking?: boolean;
  }>;
  isPublished?: boolean;
}

/** Changelog form data (for forms) */
export interface ChangelogFormData {
  version: string;
  title: string;
  description: string;
  type: ChangelogEntryType;
  changes: ChangelogChange[];
  isPublished: boolean;
  publishNow: boolean;
}

/** Add change input */
export interface AddChangeInput {
  type: ChangeType;
  description: string;
  issueNumber?: string;
  pullRequestNumber?: string;
  breaking?: boolean;
  component?: string;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/** Changelog filter options */
export interface ChangelogFilters {
  type?: ChangelogEntryType;
  changeType?: ChangeType;
  isPublished?: boolean;
  hasBreakingChanges?: boolean;
  search?: string;
  version?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

/** Changelog sort options */
export interface ChangelogSortOptions {
  field: 'version' | 'publishedAt' | 'createdAt' | 'updatedAt';
  order: 'asc' | 'desc';
}

/** Changelog pagination options */
export interface ChangelogPaginationOptions {
  page?: number;
  limit?: number;
}

/** Combined changelog query options */
export interface ChangelogQueryOptions extends ChangelogFilters, ChangelogPaginationOptions {
  sortBy?: ChangelogSortOptions['field'];
  sortOrder?: 'asc' | 'desc';
  includeUnpublished?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Single changelog API response */
export interface ChangelogResponse {
  success: boolean;
  entry: ChangelogEntry | null;
  error?: string;
}

/** Paginated changelog response */
export interface PaginatedChangelog {
  entries: ChangelogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Changelog list API response */
export interface ChangelogListResponse {
  success: boolean;
  data: PaginatedChangelog;
  error?: string;
}

/** Latest changelog response */
export interface LatestChangelogResponse {
  success: boolean;
  entry: ChangelogEntry | null;
  error?: string;
}

/** Changelog stats response */
export interface ChangelogStatsResponse {
  success: boolean;
  stats: ChangelogStats;
  error?: string;
}

/** Create/Update changelog response */
export interface ChangelogMutationResponse {
  success: boolean;
  entry?: ChangelogEntry;
  error?: string;
  message?: string;
}

/** Delete changelog response */
export interface ChangelogDeleteResponse {
  success: boolean;
  deleted: boolean;
  error?: string;
}

/** Publish changelog response */
export interface ChangelogPublishResponse {
  success: boolean;
  entry?: ChangelogEntry;
  error?: string;
  message?: string;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Changelog entry type configuration */
export const CHANGELOG_ENTRY_TYPE_CONFIG: Record<ChangelogEntryType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  emoji: string;
  description: string;
}> = {
  feature: {
    label: 'New Feature',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'Sparkles',
    emoji: '✨',
    description: 'New functionality added to the product',
  },
  improvement: {
    label: 'Improvement',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'TrendingUp',
    emoji: '🚀',
    description: 'Enhancements to existing features',
  },
  bugfix: {
    label: 'Bug Fix',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Bug',
    emoji: '🐛',
    description: 'Fixes for reported issues',
  },
  security: {
    label: 'Security',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'Shield',
    emoji: '🔒',
    description: 'Security-related updates',
  },
};

/** Change type configuration */
export const CHANGE_TYPE_CONFIG: Record<ChangeType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  emoji: string;
  prefix: string;
}> = {
  added: {
    label: 'Added',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'Plus',
    emoji: '➕',
    prefix: 'Added',
  },
  changed: {
    label: 'Changed',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'RefreshCw',
    emoji: '🔄',
    prefix: 'Changed',
  },
  deprecated: {
    label: 'Deprecated',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock',
    emoji: '⏰',
    prefix: 'Deprecated',
  },
  removed: {
    label: 'Removed',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'Trash',
    emoji: '🗑️',
    prefix: 'Removed',
  },
  fixed: {
    label: 'Fixed',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'Wrench',
    emoji: '🔧',
    prefix: 'Fixed',
  },
  security: {
    label: 'Security',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    icon: 'Lock',
    emoji: '🔐',
    prefix: 'Security',
  },
};

/** Version badge configuration */
export const VERSION_BADGE_CONFIG: Record<VersionBump, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  major: {
    label: 'Major',
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  minor: {
    label: 'Minor',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  patch: {
    label: 'Patch',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Parse semantic version string */
export function parseVersion(version: string): SemanticVersion | null {
  // Match standard semver: 1.2.3, v1.2.3, 1.2.3-beta, 1.2.3+build
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?(?:\+([a-zA-Z0-9.]+))?$/);
  
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/** Format semantic version to string */
export function formatVersion(version: SemanticVersion): string {
  let str = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) str += `-${version.prerelease}`;
  if (version.build) str += `+${version.build}`;
  return str;
}

/** Compare two versions */
export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  
  if (!vA && !vB) return 0;
  if (!vA) return -1;
  if (!vB) return 1;
  
  if (vA.major !== vB.major) return vA.major - vB.major;
  if (vA.minor !== vB.minor) return vA.minor - vB.minor;
  if (vA.patch !== vB.patch) return vA.patch - vB.patch;
  
  // Pre-release versions have lower precedence
  if (vA.prerelease && !vB.prerelease) return -1;
  if (!vA.prerelease && vB.prerelease) return 1;
  
  return 0;
}

/** Get version bump type between two versions */
export function getVersionBump(oldVersion: string, newVersion: string): VersionBump | null {
  const vOld = parseVersion(oldVersion);
  const vNew = parseVersion(newVersion);
  
  if (!vOld || !vNew) return null;
  
  if (vNew.major > vOld.major) return 'major';
  if (vNew.minor > vOld.minor) return 'minor';
  if (vNew.patch > vOld.patch) return 'patch';
  
  return null;
}

/** Increment version */
export function incrementVersion(version: string, bump: VersionBump): string {
  const parsed = parseVersion(version);
  
  if (!parsed) {
    // Default to 0.0.1 for patch if version is invalid
    switch (bump) {
      case 'major': return '1.0.0';
      case 'minor': return '0.1.0';
      case 'patch': return '0.0.1';
    }
  }
  
  switch (bump) {
    case 'major':
      return `${parsed.major + 1}.0.0`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
}

/** Validate version format */
export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}

/** Group changes by type */
export function groupChangesByType(changes: ChangelogChange[]): Record<ChangeType, ChangelogChange[]> {
  const grouped: Record<ChangeType, ChangelogChange[]> = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
  };
  
  for (const change of changes) {
    if (grouped[change.type]) {
      grouped[change.type].push(change);
    }
  }
  
  return grouped;
}

/** Get breaking changes */
export function getBreakingChanges(changes: ChangelogChange[]): ChangelogChange[] {
  return changes.filter(change => change.breaking === true);
}

/** Check if entry has breaking changes */
export function hasBreakingChanges(changes: ChangelogChange[]): boolean {
  return changes.some(change => change.breaking === true);
}

/** Get entry type config */
export function getEntryTypeConfig(type: ChangelogEntryType) {
  return CHANGELOG_ENTRY_TYPE_CONFIG[type];
}

/** Get change type config */
export function getChangeTypeConfig(type: ChangeType) {
  return CHANGE_TYPE_CONFIG[type];
}

/** Format publish date */
export function formatPublishDate(date: Date | string | null | undefined): string {
  if (!date) return 'Unpublished';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format publish date relative */
export function formatPublishDateRelative(date: Date | string | null | undefined): string {
  if (!date) return 'Unpublished';
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/** Format changelog entry for display */
export function formatChangelogEntry(
  entry: ChangelogEntry,
  options: { isLatest?: boolean } = {}
): ChangelogEntryDisplay {
  const changesByType = groupChangesByType(entry.changes);
  const breakingChanges = getBreakingChanges(entry.changes);
  
  return {
    ...entry,
    formattedDate: formatPublishDate(entry.publishedAt),
    relativeDate: formatPublishDateRelative(entry.publishedAt),
    changesByType,
    breakingChanges,
    hasBreakingChanges: breakingChanges.length > 0,
    totalChanges: entry.changes.length,
    versionParsed: parseVersion(entry.version),
    isLatest: options.isLatest ?? false,
  };
}

/** Convert entry to summary */
export function toChangelogSummary(
  entry: ChangelogEntry,
  options: { isLatest?: boolean } = {}
): ChangelogSummary {
  return {
    id: entry.id,
    version: entry.version,
    title: entry.title,
    type: entry.type,
    publishedAt: entry.publishedAt,
    totalChanges: entry.changes.length,
    hasBreakingChanges: hasBreakingChanges(entry.changes),
    isLatest: options.isLatest ?? false,
  };
}

/** Validate changelog input */
export function validateChangelogInput(input: CreateChangelogInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input.version) {
    errors.push('Version is required');
  } else if (!isValidVersion(input.version)) {
    errors.push('Invalid version format (use semantic versioning: x.y.z)');
  }
  
  if (!input.title || input.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  
  if (input.title && input.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!input.description || input.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!input.type || !CHANGELOG_ENTRY_TYPE_CONFIG[input.type]) {
    errors.push('Invalid changelog type');
  }
  
  if (!input.changes || input.changes.length === 0) {
    errors.push('At least one change is required');
  }
  
  if (input.changes) {
    for (let i = 0; i < input.changes.length; i++) {
      const change = input.changes[i];
      if (!change.type || !CHANGE_TYPE_CONFIG[change.type]) {
        errors.push(`Change ${i + 1}: Invalid change type`);
      }
      if (!change.description || change.description.trim().length < 5) {
        errors.push(`Change ${i + 1}: Description must be at least 5 characters`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Generate changelog markdown */
export function generateChangelogMarkdown(entry: ChangelogEntry): string {
  const lines: string[] = [];
  
  lines.push(`## [${entry.version}] - ${formatPublishDate(entry.publishedAt)}`);
  lines.push('');
  lines.push(entry.description);
  lines.push('');
  
  const grouped = groupChangesByType(entry.changes);
  
  const typeOrder: ChangeType[] = ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'];
  
  for (const type of typeOrder) {
    const changes = grouped[type];
    if (changes.length > 0) {
      const config = CHANGE_TYPE_CONFIG[type];
      lines.push(`### ${config.label}`);
      lines.push('');
      for (const change of changes) {
        let line = `- ${change.description}`;
        if (change.breaking) line += ' **BREAKING**';
        if (change.issueNumber) line += ` (#${change.issueNumber})`;
        if (change.pullRequestNumber) line += ` (PR #${change.pullRequestNumber})`;
        lines.push(line);
      }
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/** Sort changelog entries by version */
export function sortByVersion(entries: ChangelogEntry[], order: 'asc' | 'desc' = 'desc'): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const comparison = compareVersions(a.version, b.version);
    return order === 'desc' ? -comparison : comparison;
  });
}

/** Sort changelog entries by publish date */
export function sortByPublishDate(entries: ChangelogEntry[], order: 'asc' | 'desc' = 'desc'): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/** Filter changelog entries */
export function filterChangelogEntries(entries: ChangelogEntry[], filters: ChangelogFilters): ChangelogEntry[] {
  return entries.filter((entry) => {
    if (filters.type && entry.type !== filters.type) return false;
    if (filters.isPublished !== undefined && entry.isPublished !== filters.isPublished) return false;
    if (filters.hasBreakingChanges !== undefined) {
      const hasBc = hasBreakingChanges(entry.changes);
      if (filters.hasBreakingChanges !== hasBc) return false;
    }
    if (filters.version && entry.version !== filters.version) return false;
    if (filters.changeType) {
      const hasChangeType = entry.changes.some(c => c.type === filters.changeType);
      if (!hasChangeType) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const inVersion = entry.version.toLowerCase().includes(searchLower);
      const inTitle = entry.title.toLowerCase().includes(searchLower);
      const inDescription = entry.description.toLowerCase().includes(searchLower);
      const inChanges = entry.changes.some(c => 
        c.description.toLowerCase().includes(searchLower)
      );
      if (!inVersion && !inTitle && !inDescription && !inChanges) return false;
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (!entry.publishedAt || new Date(entry.publishedAt) < startDate) return false;
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (!entry.publishedAt || new Date(entry.publishedAt) > endDate) return false;
    }
    return true;
  });
}

/** Paginate changelog entries */
export function paginateChangelogEntries(
  entries: ChangelogEntry[],
  page: number = 1,
  limit: number = 10
): PaginatedChangelog {
  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedEntries = entries.slice(startIndex, endIndex);
  
  return {
    entries: paginatedEntries,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** Calculate changelog stats */
export function calculateChangelogStats(entries: ChangelogEntry[]): ChangelogStats {
  const publishedEntries = entries.filter(e => e.isPublished);
  const draftEntries = entries.filter(e => !e.isPublished);
  
  const byType: Record<ChangelogEntryType, number> = {
    feature: 0,
    improvement: 0,
    bugfix: 0,
    security: 0,
  };
  
  const byChangeType: Record<ChangeType, number> = {
    added: 0,
    changed: 0,
    deprecated: 0,
    removed: 0,
    fixed: 0,
    security: 0,
  };
  
  let totalChanges = 0;
  let breakingChangesCount = 0;
  
  for (const entry of entries) {
    byType[entry.type]++;
    totalChanges += entry.changes.length;
    
    for (const change of entry.changes) {
      byChangeType[change.type]++;
      if (change.breaking) breakingChangesCount++;
    }
  }
  
  // Sort by version to get latest
  const sorted = sortByVersion(publishedEntries);
  const latest = sorted[0];
  
  // Calculate versions this month/year
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  
  const versionsThisMonth = publishedEntries.filter(e => 
    e.publishedAt && new Date(e.publishedAt) >= startOfMonth
  ).length;
  
  const versionsThisYear = publishedEntries.filter(e => 
    e.publishedAt && new Date(e.publishedAt) >= startOfYear
  ).length;
  
  return {
    totalEntries: entries.length,
    publishedEntries: publishedEntries.length,
    draftEntries: draftEntries.length,
    totalChanges,
    breakingChanges: breakingChangesCount,
    byType,
    byChangeType,
    latestVersion: latest?.version || null,
    latestPublishedAt: latest?.publishedAt || null,
    versionsThisMonth,
    versionsThisYear,
  };
}

/** Generate RSS feed item from changelog entry */
export function toRSSItem(entry: ChangelogEntry): {
  title: string;
  description: string;
  pubDate: string;
  guid: string;
} {
  return {
    title: `v${entry.version}: ${entry.title}`,
    description: entry.description,
    pubDate: entry.publishedAt ? new Date(entry.publishedAt).toUTCString() : '',
    guid: `changelog-${entry.id}`,
  };
}

export default ChangelogEntry;