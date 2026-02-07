// ============================================================================
// FILE: app/(dashboard)/api-keys/[id]/page.tsx
// PURPOSE: Individual API key detail page
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/(dashboard)/api-keys/page.tsx - Parent API keys page
// 2. app/(dashboard)/settings/api-keys/[id]/page.tsx - Settings key detail
// 3. app/(dashboard)/platforms/[id]/page.tsx - Platform detail page
// 4. app/(dashboard)/goals/[id]/page.tsx - Goal detail page
// 5. components/api-keys/ApiKeyCard.tsx - Key card component
// 6. components/api-keys/ApiKeyUsage.tsx - Usage statistics
// 7. components/api-keys/ApiKeyForm.tsx - Edit form
// 8. app/api/api-keys/[id]/route.ts - Key detail endpoint
// 9. app/api/api-keys/[id]/usage/route.ts - Usage endpoint
// 10. types/api.ts - API key types
// -----------------------------------------------------------------------------

// PAGE STRUCTURE:
// - Header with key name and actions
// - Key details (scopes, created, last used)
// - Usage statistics and charts
// - Request logs
// - Edit/Regenerate/Revoke actions

// FEATURES:
// - Dynamic route with key ID
// - Usage analytics
// - Request history
// - Edit key settings
