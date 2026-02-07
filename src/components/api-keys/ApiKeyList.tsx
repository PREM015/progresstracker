// ============================================================================
// FILE: components/api-keys/ApiKeyList.tsx
// PURPOSE: List of user's API keys
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/settings/ApiKeyManager.tsx - API key management
// 2. components/billing/PaymentMethodsList.tsx - List with actions
// 3. components/platforms/PlatformList.tsx - List component pattern
// 4. components/common/DataTable.tsx - Table display
// 5. components/common/EmptyState.tsx - Empty state
// 6. components/api-keys/ApiKeyCard.tsx - Individual key card
// 7. app/(dashboard)/settings/api-keys/page.tsx - API keys settings page
// 8. app/api/api-keys/route.ts - API keys endpoint
// 9. types/api.ts - API key types
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - apiKeys: ApiKey[]
// - isLoading?: boolean
// - onCreateNew?: () => void
// - onRevoke?: (id: string) => void
// - onRegenerate?: (id: string) => void

// FEATURES:
// - List of API key cards
// - Create new button
// - Empty state when no keys
// - Loading skeleton
// - Confirmation for destructive actions
