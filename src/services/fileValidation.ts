// src/services/fileValidation.ts
// ============================================================================
// Pure file validation utilities — NO fs, path, sharp, or s3 imports.
// Keeping this module dependency-free ensures it does NOT trigger Next.js
// whole-project NFT tracing when imported by API routes.
// ============================================================================

export interface ValidationRules {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a File against size, MIME type, and extension rules.
 * Pure function — safe to import in any route without triggering NFT warnings.
 */
export function validateFile(file: File, rules: ValidationRules): ValidationResult {
  const errors: string[] = [];

  if (rules.maxSize && file.size > rules.maxSize) {
    errors.push(`File size exceeds maximum of ${Math.round(rules.maxSize / 1024 / 1024)}MB`);
  }

  if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  if (rules.allowedExtensions) {
    const lastDot = file.name.lastIndexOf('.');
    const ext = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : '';
    if (!rules.allowedExtensions.includes(ext)) {
      errors.push(`File extension ${ext} is not allowed`);
    }
  }

  return { valid: errors.length === 0, errors };
}
