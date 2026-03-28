// src/types/blog-comment.ts
// Blog comment types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type BlogCommentStatus = 'pending' | 'approved' | 'rejected' | 'spam' | 'deleted';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Blog comment record (matches Prisma BlogComment model) */
export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  content: string;
  status: BlogCommentStatus;
  likeCount: number;
  replyCount: number;
  isEdited: boolean;
  editedAt?: Date | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Blog comment with author info */
export interface BlogCommentWithAuthor extends BlogComment {
  author: {
    id: string;
    name: string | null;
    image: string | null;
    username?: string | null;
  };
  replies?: BlogCommentWithAuthor[];
}

/** Threaded comment tree */
export interface BlogCommentThread {
  comment: BlogCommentWithAuthor;
  replies: BlogCommentWithAuthor[];
  totalReplies: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateBlogCommentInput {
  postId: string;
  content: string;
  parentId?: string;
}

export interface UpdateBlogCommentInput {
  content: string;
}

export interface ModerateCommentInput {
  commentId: string;
  status: BlogCommentStatus;
  reason?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface BlogCommentQuery {
  postId?: string;
  authorId?: string;
  status?: BlogCommentStatus;
  parentId?: string | null;
  page?: number;
  limit?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface BlogCommentsResponse {
  comments: BlogCommentThread[];
  total: number;
  hasMore: boolean;
}

export default BlogComment;
