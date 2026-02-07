// ============================================================================
// FILE: components/api-keys/ApiKeyUsage.tsx
// PURPOSE: Display API key usage statistics
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/analytics/OverviewStats.tsx - Stats display
// 2. components/billing/UsageMeter.tsx - Usage meter component
// 3. components/charts/LineChart.tsx - Usage chart
// 4. components/charts/BarChart.tsx - Request chart
// 5. components/dashboard/ActivityChart.tsx - Activity chart
// 6. app/api/api-keys/[id]/usage/route.ts - Usage endpoint
// 7. app/api/api-keys/usage/route.ts - Overall usage endpoint
// 8. types/api.ts - API usage types
// 9. prisma/schema.prisma - ApiKey model (usageCount, etc.)
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - apiKeyId: string
// - usage: ApiKeyUsageData
// - period?: 'day' | 'week' | 'month'
// - showChart?: boolean

// FEATURES:
// - Total requests count
// - Requests per day/hour chart
// - Rate limit status
// - Success/error breakdown
// - Last used timestamp
// - Endpoint breakdown
