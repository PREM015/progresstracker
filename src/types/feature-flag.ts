// ============================================================================
// FILE: types/feature-flag.ts
// PURPOSE: Feature flag type definitions
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. types/system.ts - System types
// 2. types/billing.ts - Subscription tier (for targeting)
// 3. prisma/schema.prisma - FeatureFlag model
// 4. services/featureFlagService.ts - Feature flag service
// 5. lib/featureFlags.ts - Feature flag utilities
// 6. app/api/feature-flags/route.ts - Feature flags API
// 7. app/api/admin/feature-flags/route.ts - Admin feature flags
// 8. components/admin/feature-flags/ - Admin components
// 9. config/feature-flags.ts - Feature flag defaults
// -----------------------------------------------------------------------------

// TYPES TO DEFINE:
// - FeatureFlag (flag record)
// - FeatureFlagKey (string literal union of flag keys)
// - FeatureFlagTargeting (targeting rules)
// - FeatureFlagEvaluation (evaluation result)
// - CreateFeatureFlagInput
// - UpdateFeatureFlagInput
// - FeatureFlagResponse (API response)
// - UserFeatureFlags (map of flag key to enabled status)
