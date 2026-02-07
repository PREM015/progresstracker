// ============================================================================
// FILE: app/api/feature-flags/user/route.ts
// PURPOSE: User-specific feature flag check endpoint
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. app/api/feature-flags/route.ts - Main feature flags endpoint
// 2. app/api/feature-flags/check/route.ts - Feature flag check logic
// 3. app/api/feature-flags/enabled/route.ts - Enabled flags endpoint
// 4. app/api/feature-flags/[key]/route.ts - Individual flag check
// 5. app/api/admin/feature-flags/route.ts - Admin feature flag management
// 6. services/featureFlagService.ts - Feature flag service logic
// 7. lib/featureFlags.ts - Feature flag utilities
// 8. types/feature-flag.ts - Feature flag type definitions
// 9. prisma/schema.prisma - FeatureFlag model
// 10. lib/auth.ts - Get current user session
// -----------------------------------------------------------------------------

// METHODS TO IMPLEMENT:
// - GET: Get all feature flags enabled for current user

// IMPLEMENTATION NOTES:
// - Requires authentication
// - Check user's subscription tier
// - Check if user ID is in enabledUserIds
// - Check percentage rollout
// - Return map of flagKey: boolean
// - Cache per user with short TTL
