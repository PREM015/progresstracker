// ============================================================================
// FILE: components/api-keys/ApiKeyCard.tsx
// PURPOSE: Display individual API key information
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/settings/ApiKeyManager.tsx - API key management component
// 2. components/platforms/PlatformCard.tsx - Card component pattern
// 3. components/billing/PaymentMethodsList.tsx - List item with actions
// 4. components/common/StatusIndicator.tsx - Status indicator
// 5. components/widgets/CopyButton.tsx - Copy to clipboard
// 6. app/api/api-keys/route.ts - API keys endpoint
// 7. app/api/api-keys/[id]/route.ts - Individual key endpoint
// 8. services/apiKeyService.ts - API key service (if exists)
// 9. types/api.ts - API key types
// 10. prisma/schema.prisma - ApiKey model
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - apiKey: ApiKey
// - onRevoke?: (id: string) => void
// - onRegenerate?: (id: string) => void
// - showUsage?: boolean

// FEATURES:
// - Key name and description
// - Masked key with copy button
// - Created/last used date
// - Scopes/permissions badges
// - Revoke and regenerate actions
// - Usage stats preview
