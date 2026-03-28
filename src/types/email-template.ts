// src/types/email-template.ts
// Email template types for dynamic email content

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type EmailTemplateCategory =
  | 'auth'
  | 'transactional'
  | 'marketing'
  | 'notifications'
  | 'support'
  | 'billing'
  | 'system';

export type EmailTemplateStatus = 'active' | 'draft' | 'archived';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Email template record (matches Prisma EmailTemplate model) */
export interface EmailTemplate {
  id: string;
  name: string;
  slug: string; // Unique identifier like 'welcome', 'password-reset'
  category: EmailTemplateCategory;
  subject: string;
  previewText?: string | null;
  htmlContent: string;
  textContent?: string | null;
  variables: EmailTemplateVariable[];
  status: EmailTemplateStatus;
  version: number;
  isSystem: boolean; // System templates can't be deleted
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Template variable definition */
export interface EmailTemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'date';
}

/** Email template test result */
export interface EmailTemplateTestResult {
  success: boolean;
  renderedSubject?: string;
  renderedHtml?: string;
  renderedText?: string;
  errors?: string[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateEmailTemplateInput {
  name: string;
  slug: string;
  category: EmailTemplateCategory;
  subject: string;
  previewText?: string;
  htmlContent: string;
  textContent?: string;
  variables?: EmailTemplateVariable[];
  status?: EmailTemplateStatus;
}

export interface UpdateEmailTemplateInput extends Partial<CreateEmailTemplateInput> {}

export interface RenderEmailTemplateInput {
  slug: string;
  variables: Record<string, string | number | boolean>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function interpolateEmailTemplate(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`
  );
}

export default EmailTemplate;
