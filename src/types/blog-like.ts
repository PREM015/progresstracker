// src/types/blog-like.ts
// Blog post like types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Blog post like record (matches Prisma BlogPostLike model) */
export interface BlogLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

/** Like status for a user */
export interface UserLikeStatus {
  isLiked: boolean;
  likeId?: string;
  likedAt?: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface ToggleBlogLikeInput {
  postId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ToggleBlogLikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface BlogLikeCountResponse {
  postId: string;
  count: number;
  isLiked: boolean;
}

export default BlogLike;
