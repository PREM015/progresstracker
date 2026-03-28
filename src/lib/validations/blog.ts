// src/lib/validations/blog.ts
// Blog general validation schemas (re-exports from sub-modules + blog-level schemas)

export {
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  BlogPostQuerySchema,
  type CreateBlogPostInput,
  type UpdateBlogPostInput,
  type BlogPostQueryInput,
} from './blog-post';

export {
  CreateBlogCommentSchema,
  UpdateBlogCommentSchema,
  ModerateCommentSchema,
  BlogCommentQuerySchema,
  type CreateBlogCommentInput,
  type UpdateBlogCommentInput,
  type ModerateCommentInput,
} from './blog-comment';
