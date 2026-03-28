// src/types/bookmark.ts
// Bookmark types for saving content

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type BookmarkType =
  | 'problem'
  | 'article'
  | 'blog_post'
  | 'solution'
  | 'tutorial'
  | 'resource'
  | 'platform'
  | 'user_profile';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Bookmark record (matches Prisma Bookmark model) */
export interface Bookmark {
  id: string;
  userId: string;
  type: BookmarkType;
  title: string;
  description?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  tags: string[];
  notes?: string | null;
  isFavorite: boolean;
  platformId?: string | null;
  externalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Bookmark with platform info */
export interface BookmarkWithPlatform extends Bookmark {
  platform?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateBookmarkInput {
  type: BookmarkType;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
  platformId?: string;
  externalId?: string;
}

export interface UpdateBookmarkInput {
  title?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface BookmarkQuery {
  type?: BookmarkType;
  tags?: string[];
  isFavorite?: boolean;
  search?: string;
  platformId?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface BookmarkListResponse {
  bookmarks: BookmarkWithPlatform[];
  total: number;
  favoriteCount: number;
  byType: Record<BookmarkType, number>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getBookmarkTypeLabel(type: BookmarkType): string {
  const labels: Record<BookmarkType, string> = {
    problem: 'Problem',
    article: 'Article',
    blog_post: 'Blog Post',
    solution: 'Solution',
    tutorial: 'Tutorial',
    resource: 'Resource',
    platform: 'Platform',
    user_profile: 'User Profile',
  };
  return labels[type];
}

export default Bookmark;
