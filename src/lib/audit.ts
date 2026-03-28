// src/lib/audit.ts
// Client-accessible audit log utilities (non-server)

// =============================================================================
// TYPES
// =============================================================================

export interface AuditEventData {
  action: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    fields?: string[];
  };
}

export interface AuditEventResult {
  success: boolean;
  logId?: string;
  error?: string;
}

// =============================================================================
// AUDIT HELPERS
// =============================================================================

/**
 * Calculate the diff between two objects for audit logging.
 * Returns only changed fields.
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown>; fields: string[] } {
  const fields: string[] = [];
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      fields.push(key);
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return { before: changedBefore, after: changedAfter, fields };
}

/**
 * Redact sensitive fields from an object before audit logging.
 */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'tokenHash',
  'accessToken',
  'refreshToken',
  'apiKey',
  'p256dhKey',
  'authKey',
  'cardNumber',
  'cvv',
];

export function redactSensitiveFields(
  obj: Record<string, unknown>,
  fieldsToRedact: string[] = SENSITIVE_FIELDS
): Record<string, unknown> {
  const redacted = { ...obj };
  for (const field of fieldsToRedact) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Sanitize an object for audit logging (strips sensitive + nulls).
 */
export function sanitizeForAudit(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = redactSensitiveFields(obj);
  return Object.fromEntries(
    Object.entries(redacted).filter(([, v]) => v !== undefined && v !== null)
  );
}

// =============================================================================
// ACTION FORMATTERS
// =============================================================================

/**
 * Format an audit action into a human-readable string.
 */
export function formatAuditAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' → ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Build a human-readable description of a diff.
 */
export function describeDiff(
  fields: string[],
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string {
  if (fields.length === 0) return 'No changes';
  if (fields.length === 1) {
    const field = fields[0];
    return `Changed ${field} from ${JSON.stringify(before[field])} to ${JSON.stringify(after[field])}`;
  }
  return `Changed ${fields.length} fields: ${fields.join(', ')}`;
}
