// src/types/content.ts
// ===== FILE: src/types/content.ts =====
// Complete content types for blog posts and changelog entries

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Content status */
export type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';

/** Content type */
export type ContentType = 'blog' | 'changelog' | 'announcement' | 'guide';

/** Changelog entry type */
export type ChangelogType = 'feature' | 'improvement' | 'bugfix' | 'security' | 'breaking';

/** Blog post category */
export type BlogCategory = 
  | 'tutorial'
  | 'news'
  | 'update'
  | 'announcement'
  | 'guide'
  | 'case-study'
  | 'engineering'
  | 'tips';

// =============================================================================
// BLOG POST TYPES
// =============================================================================

/** Blog post (matches Prisma BlogPost model) */
export interface BlogPost {
  id: string;

  // Content
  slug: string;
  title: string;
  excerpt?: string;
  content: string;

  // Media
  featuredImage?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Classification
  category?: string;
  tags: string[];

  // Author
  authorId?: string;
  authorName?: string;

  // Status
  status: string;
  publishedAt?: Date;

  // Stats
  viewCount: number;
  likeCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Blog post for display */
export interface BlogPostDisplay extends BlogPost {
  readingTime: number; // minutes
  formattedDate: string;
  categoryLabel: string;
  categoryColor: string;
  excerpt: string;
}

/** Blog post list item */
export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  category?: string;
  tags: string[];
  authorName?: string;
  publishedAt?: Date;
  viewCount: number;
  likeCount: number;
  readingTime: number;
}

// =============================================================================
// CHANGELOG TYPES
// =============================================================================

/** Changelog entry (matches Prisma ChangelogEntry model) */
export interface ChangelogEntry {
  id: string;

  version: string;
  title: string;
  description: string;

  // Type
  type: string;

  // Content - structure: [{ type: "added", description: "..." }, ...]
  changes: ChangelogChange[];

  // Status
  isPublished: boolean;
  publishedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Changelog change item */
export interface ChangelogChange {
  type: ChangelogType;
  description: string;
  issueNumber?: string;
  pullRequestNumber?: string;
  breaking?: boolean;
}

/** Changelog entry for display */
export interface ChangelogEntryDisplay extends ChangelogEntry {
  formattedDate: string;
  changesByType: Record<ChangelogType, ChangelogChange[]>;
  breakingChanges: ChangelogChange[];
  hasBreakingChanges: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create blog post input */
export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
  publishedAt?: Date;
}

/** Update blog post input */
export interface UpdateBlogPostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  status?: ContentStatus;
  publishedAt?: Date;
}

/** Create changelog input */
export interface CreateChangelogInput {
  version: string;
  title: string;
  description: string;
  type?: ChangelogType;
  changes: ChangelogChange[];
  isPublished?: boolean;
  publishedAt?: Date;
}

/** Update changelog input */
export interface UpdateChangelogInput {
  version?: string;
  title?: string;
  description?: string;
  type?: ChangelogType;
  changes?: ChangelogChange[];
  isPublished?: boolean;
  publishedAt?: Date;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/** Blog post filter */
export interface BlogPostFilter {
  status?: ContentStatus;
  category?: string;
  tags?: string[];
  authorId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

/** Changelog filter */
export interface ChangelogFilter {
  type?: ChangelogType;
  isPublished?: boolean;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Blog category configuration */
export const BLOG_CATEGORY_CONFIG: Record<BlogCategory, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  tutorial: {
    label: 'Tutorial',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'BookOpen'
  },
  news: {
    label: 'News',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'Newspaper'
  },
  update: {
    label: 'Update',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'RefreshCw'
  },
  announcement: {
    label: 'Announcement',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Megaphone'
  },
  guide: {
    label: 'Guide',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    icon: 'Map'
  },
  'case-study': {
    label: 'Case Study',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    icon: 'FileText'
  },
  engineering: {
    label: 'Engineering',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    icon: 'Code'
  },
  tips: {
    label: 'Tips & Tricks',
    color: '#14B8A6',
    bgColor: '#CCFBF1',
    icon: 'Lightbulb'
  },
};

/** Changelog type configuration */
export const CHANGELOG_TYPE_CONFIG: Record<ChangelogType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  emoji: string;
}> = {
  feature: {
    label: 'New Feature',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'Sparkles',
    emoji: '✨'
  },
  improvement: {
    label: 'Improvement',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'TrendingUp',
    emoji: '🚀'
  },
  bugfix: {
    label: 'Bug Fix',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Bug',
    emoji: '🐛'
  },
  security: {
    label: 'Security',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'Shield',
    emoji: '🔒'
  },
  breaking: {
    label: 'Breaking Change',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    icon: 'AlertTriangle',
    emoji: '⚠️'
  },
};

/** Content status configuration */
export const CONTENT_STATUS_CONFIG: Record<ContentStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'FileEdit'
  },
  published: {
    label: 'Published',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  archived: {
    label: 'Archived',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'Archive'
  },
  scheduled: {
    label: 'Scheduled',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Clock'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate reading time */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/** Generate slug from title */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Get blog category config */
export function getBlogCategoryConfig(category: BlogCategory) {
  return BLOG_CATEGORY_CONFIG[category];
}

/** Get changelog type config */
export function getChangelogTypeConfig(type: ChangelogType) {
  return CHANGELOG_TYPE_CONFIG[type];
}

/** Get content status config */
export function getContentStatusConfig(status: ContentStatus) {
  return CONTENT_STATUS_CONFIG[status];
}

/** Group changes by type */
export function groupChangesByType(changes: ChangelogChange[]): Record<ChangelogType, ChangelogChange[]> {
  return changes.reduce((acc, change) => {
    if (!acc[change.type]) acc[change.type] = [];
    acc[change.type].push(change);
    return acc;
  }, {} as Record<ChangelogType, ChangelogChange[]>);
}

/** Get breaking changes */
export function getBreakingChanges(changes: ChangelogChange[]): ChangelogChange[] {
  return changes.filter(change => change.breaking || change.type === 'breaking');
}

/** Format blog post for display */
export function formatBlogPost(post: BlogPost): BlogPostDisplay {
  return {
    ...post,
    readingTime: calculateReadingTime(post.content),
    formattedDate: post.publishedAt 
      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Draft',
    categoryLabel: post.category 
      ? BLOG_CATEGORY_CONFIG[post.category as BlogCategory]?.label || post.category
      : 'Uncategorized',
    categoryColor: post.category
      ? BLOG_CATEGORY_CONFIG[post.category as BlogCategory]?.color || '#6B7280'
      : '#6B7280',
    excerpt: post.excerpt || post.content.substring(0, 160) + '...',
  };
}

/** Format changelog entry for display */
export function formatChangelogEntry(entry: ChangelogEntry): ChangelogEntryDisplay {
  const changesByType = groupChangesByType(entry.changes);
  const breakingChanges = getBreakingChanges(entry.changes);
  
  return {
    ...entry,
    formattedDate: entry.publishedAt
      ? new Date(entry.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Unpublished',
    changesByType,
    breakingChanges,
    hasBreakingChanges: breakingChanges.length > 0,
  };
}

/** Extract excerpt from content */
export function extractExcerpt(content: string, maxLength = 160): string {
  const text = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .trim();
  
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/** Validate slug uniqueness */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Sort posts by published date */
export function sortByPublishedDate(posts: BlogPost[], order: 'asc' | 'desc' = 'desc'): BlogPost[] {
  return [...posts].sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/** Get related posts */
export function getRelatedPosts(post: BlogPost, allPosts: BlogPost[], limit = 3): BlogPost[] {
  return allPosts
    .filter(p => 
      p.id !== post.id &&
      p.status === 'published' &&
      (p.category === post.category || p.tags.some(tag => post.tags.includes(tag)))
    )
    .slice(0, limit);
}

export default BlogPost;