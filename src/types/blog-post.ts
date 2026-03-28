// src/types/blog-post.ts
// Blog post types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type BlogPostStatus = 'draft' | 'published' | 'scheduled' | 'archived' | 'deleted';
export type BlogPostVisibility = 'public' | 'unlisted' | 'members_only' | 'private';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Blog post record (matches Prisma BlogPost model) */
export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  contentHtml?: string | null;
  coverImage?: string | null;
  tags: string[];
  categories: string[];
  status: BlogPostStatus;
  visibility: BlogPostVisibility;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  readTimeMinutes: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isFeatured: boolean;
  isPinned: boolean;
  allowComments: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  canonicalUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Blog post with author info */
export interface BlogPostWithAuthor extends BlogPost {
  author: {
    id: string;
    name: string | null;
    image: string | null;
    username?: string | null;
  };
}

/** Blog post card for listing */
export interface BlogPostCard {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  tags: string[];
  publishedAt?: Date | null;
  readTimeMinutes: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  author: { id: string; name: string | null; image: string | null };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateBlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  categories?: string[];
  status?: BlogPostStatus;
  visibility?: BlogPostVisibility;
  scheduledAt?: Date;
  allowComments?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  isPinned?: boolean;
  isFeatured?: boolean;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface BlogPostQuery {
  status?: BlogPostStatus;
  authorId?: string;
  tags?: string[];
  search?: string;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'viewCount' | 'likeCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export default BlogPost;
