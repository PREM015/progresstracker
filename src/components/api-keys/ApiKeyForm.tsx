// ============================================================================
// FILE: components/api-keys/ApiKeyForm.tsx
// PURPOSE: Form to create/edit API keys
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/settings/ApiKeyManager.tsx - API key management
// 2. components/auth/RegisterForm.tsx - Form pattern
// 3. components/goals/GoalForm.tsx - Form with multiple fields
// 4. components/forms/FormInput.tsx - Input component
// 5. components/forms/FormCheckbox.tsx - Checkbox for scopes
// 6. components/forms/FormSelect.tsx - Select for rate limits
// 7. app/api/api-keys/route.ts - Create API key endpoint
// 8. types/api.ts - API key types
// 9. prisma/schema.prisma - ApiKey model
// 10. lib/validators.ts - Validation utilities
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - onSuccess?: (apiKey: ApiKey, plainKey: string) => void
// - onCancel?: () => void
// - existingKey?: ApiKey (for editing)
// - availableScopes: Scope[]

// FEATURES:
// - Name and description inputs
// - Scope selection (checkboxes)
// - Expiration date picker
// - Rate limit configuration
// - IP whitelist (optional)
// - Show generated key only once
