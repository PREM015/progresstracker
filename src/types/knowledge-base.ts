// src/types/knowledge-base.ts
// Knowledge base article and category types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type KbArticleStatus = 'draft' | 'published' | 'archived';
export type KbArticleType = 'article' | 'faq' | 'guide' | 'troubleshooting' | 'reference';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Knowledge base category (matches Prisma KnowledgeBaseCategory model) */
export interface KnowledgeBaseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  articleCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Knowledge base article (matches Prisma KnowledgeBaseArticle model) */
export interface KnowledgeBaseArticle {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  contentHtml?: string | null;
  type: KbArticleType;
  status: KbArticleStatus;
  tags: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isFeatured: boolean;
  isFaq: boolean;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Article with category and author */
export interface KnowledgeBaseArticleWithDetails extends KnowledgeBaseArticle {
  category: Pick<KnowledgeBaseCategory, 'id' | 'name' | 'slug' | 'icon'>;
  author: { id: string; name: string | null; image: string | null };
  relatedArticles?: KnowledgeBaseArticleSummary[];
}

/** Article summary for listing */
export interface KnowledgeBaseArticleSummary {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  type: KbArticleType;
  viewCount: number;
  helpfulCount: number;
  publishedAt?: Date | null;
  categorySlug: string;
  categoryName: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateKbArticleInput {
  categoryId: string;
  title: string;
  summary?: string;
  content: string;
  type?: KbArticleType;
  status?: KbArticleStatus;
  tags?: string[];
  isFeatured?: boolean;
  isFaq?: boolean;
}

export interface UpdateKbArticleInput extends Partial<CreateKbArticleInput> {}

export interface KbArticleFeedbackInput {
  articleId: string;
  helpful: boolean;
  comment?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface KbArticleQuery {
  categoryId?: string;
  categorySlug?: string;
  type?: KbArticleType;
  status?: KbArticleStatus;
  tags?: string[];
  search?: string;
  isFeatured?: boolean;
  isFaq?: boolean;
  page?: number;
  limit?: number;
}

export default KnowledgeBaseArticle;
