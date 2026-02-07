// ============================================================================
// FILE: types/blog.ts
// PURPOSE: Blog-related type definitions
// ============================================================================

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Blog post status */
export type BlogStatus = 'draft' | 'published' | 'archived';

/** Blog post category */
export type BlogCategory =
  | 'tutorials'
  | 'tips'
  | 'productivity'
  | 'news'
  | 'updates'
  | 'guides'
  | 'case-studies'
  | 'interviews'
  | 'announcements'
  | 'other';

/** Blog sort options */
export type BlogSortField = 'publishedAt' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'title';
export type BlogSortOrder = 'asc' | 'desc';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Blog author information */
export interface BlogAuthor {
  id?: string;
  name: string;
  avatar?: string;
  bio?: string;
  email?: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

/** Blog tag */
export interface BlogTag {
  name: string;
  slug: string;
  count?: number;
  color?: string;
}

/** Blog category with metadata */
export interface BlogCategoryInfo {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  count?: number;
}

/** Main BlogPost interface (matches Prisma schema) */
export interface BlogPost {
  id: string;
  
  // Content
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  
  // Media
  featuredImage?: string | null;
  
  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  
  // Classification
  category?: string | null;
  tags: string[];
  
  // Author
  authorId?: string | null;
  authorName?: string | null;
  
  // Status
  status: BlogStatus;
  publishedAt?: Date | null;
  
  // Stats
  viewCount: number;
  likeCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Blog post with computed fields */
export interface BlogPostWithMeta extends BlogPost {
  // Computed fields
  readTime: number;
  wordCount: number;
  isPublished: boolean;
  isNew: boolean; // Published within last 7 days
  
  // Expanded author
  author?: BlogAuthor;
  
  // Related posts
  relatedPosts?: BlogPostSummary[];
  
  // Navigation
  previousPost?: BlogPostSummary | null;
  nextPost?: BlogPostSummary | null;
}

/** Blog post summary (for lists) */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category?: string | null;
  tags: string[];
  authorName?: string | null;
  author?: BlogAuthor;
  publishedAt?: Date | null;
  readTime: number;
  viewCount: number;
  likeCount: number;
}

/** Blog post card (minimal for UI cards) */
export interface BlogPostCard {
  slug: string;
  title: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  category?: string | null;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
}

/** Blog comment (for future use) */
export interface BlogComment {
  id: string;
  postId: string;
  userId?: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  content: string;
  isApproved: boolean;
  isSpam: boolean;
  parentId?: string | null;
  replies?: BlogComment[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Blog statistics */
export interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  archivedPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
  tags: Array<{
    tag: string;
    count: number;
  }>;
  topPosts: BlogPostSummary[];
  recentPosts: BlogPostSummary[];
  postsPerMonth: Array<{
    month: string;
    count: number;
  }>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create blog post input */
export interface CreateBlogPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  authorId?: string;
  authorName?: string;
  status?: BlogStatus;
}

/** Update blog post input */
export interface UpdateBlogPostInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
}

/** Blog post form data (for forms) */
export interface BlogPostFormData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishNow: boolean;
  scheduledAt?: Date;
}

/** Blog filter options */
export interface BlogFilters {
  status?: BlogStatus;
  category?: string;
  tag?: string;
  search?: string;
  authorId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  hasImage?: boolean;
}

/** Blog sort options */
export interface BlogSortOptions {
  field: BlogSortField;
  order: BlogSortOrder;
}

/** Blog pagination options */
export interface BlogPaginationOptions {
  page?: number;
  limit?: number;
}

/** Combined blog query options */
export interface BlogQueryOptions extends BlogFilters, BlogPaginationOptions {
  sortBy?: BlogSortField;
  sortOrder?: BlogSortOrder;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Single blog post API response */
export interface BlogPostResponse {
  success: boolean;
  post: BlogPostWithMeta | null;
  error?: string;
}

/** Paginated blog posts response */
export interface PaginatedBlogPosts {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Blog list API response */
export interface BlogListResponse {
  success: boolean;
  data: PaginatedBlogPosts;
  error?: string;
}

/** Blog categories response */
export interface BlogCategoriesResponse {
  success: boolean;
  categories: string[];
  error?: string;
}

/** Blog tags response */
export interface BlogTagsResponse {
  success: boolean;
  tags: string[];
  error?: string;
}

/** Blog stats response */
export interface BlogStatsResponse {
  success: boolean;
  stats: BlogStats;
  error?: string;
}

/** Create/Update blog response */
export interface BlogMutationResponse {
  success: boolean;
  post?: BlogPost;
  error?: string;
  message?: string;
}

/** Delete blog response */
export interface BlogDeleteResponse {
  success: boolean;
  deleted: boolean;
  error?: string;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Blog status configuration */
export const BLOG_STATUS_CONFIG: Record<BlogStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'FileEdit',
  },
  published: {
    label: 'Published',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
  },
  archived: {
    label: 'Archived',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Archive',
  },
};

/** Blog category configuration */
export const BLOG_CATEGORY_CONFIG: Record<BlogCategory, BlogCategoryInfo> = {
  tutorials: {
    slug: 'tutorials',
    name: 'Tutorials',
    description: 'Step-by-step guides and tutorials',
    icon: 'BookOpen',
    color: '#3B82F6',
  },
  tips: {
    slug: 'tips',
    name: 'Tips & Tricks',
    description: 'Quick tips to improve your skills',
    icon: 'Lightbulb',
    color: '#F59E0B',
  },
  productivity: {
    slug: 'productivity',
    name: 'Productivity',
    description: 'Boost your coding productivity',
    icon: 'Zap',
    color: '#8B5CF6',
  },
  news: {
    slug: 'news',
    name: 'News',
    description: 'Latest news and updates',
    icon: 'Newspaper',
    color: '#EC4899',
  },
  updates: {
    slug: 'updates',
    name: 'Updates',
    description: 'Platform updates and releases',
    icon: 'Bell',
    color: '#10B981',
  },
  guides: {
    slug: 'guides',
    name: 'Guides',
    description: 'Comprehensive guides',
    icon: 'Map',
    color: '#6366F1',
  },
  'case-studies': {
    slug: 'case-studies',
    name: 'Case Studies',
    description: 'Real-world success stories',
    icon: 'FileText',
    color: '#14B8A6',
  },
  interviews: {
    slug: 'interviews',
    name: 'Interviews',
    description: 'Interviews with developers',
    icon: 'Users',
    color: '#F97316',
  },
  announcements: {
    slug: 'announcements',
    name: 'Announcements',
    description: 'Important announcements',
    icon: 'Megaphone',
    color: '#EF4444',
  },
  other: {
    slug: 'other',
    name: 'Other',
    description: 'Other topics',
    icon: 'MoreHorizontal',
    color: '#6B7280',
  },
};

/** Default featured images by category */
export const DEFAULT_FEATURED_IMAGES: Record<BlogCategory, string> = {
  tutorials: '/images/blog/tutorials-default.jpg',
  tips: '/images/blog/tips-default.jpg',
  productivity: '/images/blog/productivity-default.jpg',
  news: '/images/blog/news-default.jpg',
  updates: '/images/blog/updates-default.jpg',
  guides: '/images/blog/guides-default.jpg',
  'case-studies': '/images/blog/case-studies-default.jpg',
  interviews: '/images/blog/interviews-default.jpg',
  announcements: '/images/blog/announcements-default.jpg',
  other: '/images/blog/default.jpg',
};

/** Popular tags with colors */
export const POPULAR_TAGS: BlogTag[] = [
  { name: 'beginners', slug: 'beginners', color: '#10B981' },
  { name: 'advanced', slug: 'advanced', color: '#EF4444' },
  { name: 'leetcode', slug: 'leetcode', color: '#F59E0B' },
  { name: 'algorithms', slug: 'algorithms', color: '#3B82F6' },
  { name: 'data-structures', slug: 'data-structures', color: '#8B5CF6' },
  { name: 'javascript', slug: 'javascript', color: '#F7DF1E' },
  { name: 'python', slug: 'python', color: '#3776AB' },
  { name: 'career', slug: 'career', color: '#EC4899' },
  { name: 'motivation', slug: 'motivation', color: '#14B8A6' },
  { name: 'habits', slug: 'habits', color: '#6366F1' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate read time from content */
export function calculateReadTime(content: string): number {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, readTime); // Minimum 1 minute
}

/** Calculate word count from content */
export function calculateWordCount(content: string): number {
  // Strip HTML tags if present
  const text = content.replace(/<[^>]*>/g, '');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Generate slug from title */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/** Validate slug format */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 200;
}

/** Get category info */
export function getCategoryInfo(category: string): BlogCategoryInfo | undefined {
  return BLOG_CATEGORY_CONFIG[category as BlogCategory];
}

/** Get status config */
export function getStatusConfig(status: BlogStatus) {
  return BLOG_STATUS_CONFIG[status];
}

/** Check if post is new (published within last 7 days) */
export function isNewPost(publishedAt: Date | null | undefined): boolean {
  if (!publishedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(publishedAt) >= sevenDaysAgo;
}

/** Check if post is published */
export function isPublished(post: BlogPost): boolean {
  return post.status === 'published' && !!post.publishedAt;
}

/** Format publish date */
export function formatPublishDate(date: Date | string | null | undefined): string {
  if (!date) return 'Not published';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format publish date relative */
export function formatPublishDateRelative(date: Date | string | null | undefined): string {
  if (!date) return 'Not published';
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

/** Get excerpt from content if not provided */
export function getExcerpt(content: string, maxLength: number = 160): string {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength
  const lastSpace = text.lastIndexOf(' ', maxLength);
  const cutoff = lastSpace > 0 ? lastSpace : maxLength;
  
  return text.substring(0, cutoff).trim() + '...';
}

/** Validate blog post input */
export function validateBlogPostInput(input: CreateBlogPostInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input.slug || !isValidSlug(input.slug)) {
    errors.push('Invalid slug format');
  }
  
  if (!input.title || input.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  
  if (input.title && input.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!input.content || input.content.trim().length < 50) {
    errors.push('Content must be at least 50 characters');
  }
  
  if (input.excerpt && input.excerpt.length > 500) {
    errors.push('Excerpt must be less than 500 characters');
  }
  
  if (input.metaTitle && input.metaTitle.length > 70) {
    errors.push('Meta title should be less than 70 characters');
  }
  
  if (input.metaDescription && input.metaDescription.length > 160) {
    errors.push('Meta description should be less than 160 characters');
  }
  
  if (input.tags && input.tags.length > 10) {
    errors.push('Maximum 10 tags allowed');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Convert blog post to summary */
export function toBlogPostSummary(post: BlogPost): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    featuredImage: post.featuredImage,
    category: post.category,
    tags: post.tags,
    authorName: post.authorName,
    publishedAt: post.publishedAt,
    readTime: calculateReadTime(post.content),
    viewCount: post.viewCount,
    likeCount: post.likeCount,
  };
}

/** Convert blog post to card format */
export function toBlogPostCard(post: BlogPost): BlogPostCard {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    featuredImage: post.featuredImage,
    category: post.category,
    author: post.authorName || 'Anonymous',
    publishedAt: post.publishedAt?.toISOString() || '',
    readTime: calculateReadTime(post.content),
    tags: post.tags,
  };
}

/** Get SEO metadata from post */
export function getSEOMetadata(post: BlogPost): {
  title: string;
  description: string;
  image?: string;
  url?: string;
} {
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || getExcerpt(post.content),
    image: post.featuredImage || undefined,
  };
}

/** Sort blog posts */
export function sortBlogPosts(
  posts: BlogPost[],
  field: BlogSortField = 'publishedAt',
  order: BlogSortOrder = 'desc'
): BlogPost[] {
  return [...posts].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (field) {
      case 'publishedAt':
        aValue = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bValue = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      case 'viewCount':
        aValue = a.viewCount;
        bValue = b.viewCount;
        break;
      case 'likeCount':
        aValue = a.likeCount;
        bValue = b.likeCount;
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });
}

/** Filter blog posts */
export function filterBlogPosts(posts: BlogPost[], filters: BlogFilters): BlogPost[] {
  return posts.filter((post) => {
    if (filters.status && post.status !== filters.status) return false;
    if (filters.category && post.category !== filters.category) return false;
    if (filters.tag && !post.tags.includes(filters.tag)) return false;
    if (filters.authorId && post.authorId !== filters.authorId) return false;
    if (filters.hasImage !== undefined) {
      if (filters.hasImage && !post.featuredImage) return false;
      if (!filters.hasImage && post.featuredImage) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const inTitle = post.title.toLowerCase().includes(searchLower);
      const inExcerpt = post.excerpt?.toLowerCase().includes(searchLower);
      const inContent = post.content.toLowerCase().includes(searchLower);
      if (!inTitle && !inExcerpt && !inContent) return false;
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (!post.publishedAt || new Date(post.publishedAt) < fromDate) return false;
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (!post.publishedAt || new Date(post.publishedAt) > toDate) return false;
    }
    return true;
  });
}

/** Paginate blog posts */
export function paginateBlogPosts(
  posts: BlogPost[],
  page: number = 1,
  limit: number = 10
): PaginatedBlogPosts {
  const total = posts.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedPosts = posts.slice(startIndex, endIndex);
  
  return {
    posts: paginatedPosts.map(toBlogPostSummary),
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export default BlogPost;