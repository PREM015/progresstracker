// src/lib/validations/support.ts
// Support general barrel validation export

export {
  CreateSupportTicketSchema,
  UpdateSupportTicketSchema,
  CreateTicketReplySchema,
  SubmitSatisfactionSchema,
  SupportTicketQuerySchema,
  type CreateSupportTicketInput,
  type UpdateSupportTicketInput,
  type CreateTicketReplyInput,
  type SubmitSatisfactionInput,
} from './support-ticket';

export {
  CreateKbCategorySchema,
  CreateKbArticleSchema,
  UpdateKbArticleSchema,
  ArticleFeedbackSchema,
  KbArticleQuerySchema,
  type CreateKbCategoryInput,
  type CreateKbArticleInput,
  type UpdateKbArticleInput,
  type ArticleFeedbackInput,
} from './knowledge-base';
