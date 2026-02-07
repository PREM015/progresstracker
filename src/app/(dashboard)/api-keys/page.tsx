// ============================================================================
// FILE: app/(dashboard)/api-keys/page.tsx
// PURPOSE: User API keys management page
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/(dashboard)/settings/api-keys/page.tsx - Settings API keys page
// 2. app/(dashboard)/settings/page.tsx - Settings page layout
// 3. app/(dashboard)/integrations/page.tsx - Integrations page
// 4. app/(dashboard)/platforms/page.tsx - Platforms page layout
// 5. components/api-keys/ApiKeyList.tsx - API key list
// 6. components/api-keys/ApiKeyForm.tsx - Create key form
// 7. components/settings/ApiKeyManager.tsx - Existing API key manager
// 8. components/modals/CreateModal.tsx - Create modal
// 9. app/api/api-keys/route.ts - API keys endpoint
// 10. types/api.ts - API key types
// 11. prisma/schema.prisma - ApiKey model
// -----------------------------------------------------------------------------

// PAGE STRUCTURE:
// - Header with create button
// - Usage overview/limits
// - API keys list
// - Documentation link
// - Rate limit info

// FEATURES:
// - Create new API key modal
// - Copy key functionality
// - Revoke confirmation
// - Usage statistics per key
