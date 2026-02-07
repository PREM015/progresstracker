// ============================================================================
// FILE: components/changelog/ChangelogList.tsx
// PURPOSE: Display list of changelog entries
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/public/ChangelogPage.tsx - Changelog page component
// 2. components/public/ChangelogEntry.tsx - Individual entry component
// 3. components/public/BlogList.tsx - Blog list pattern
// 4. components/activity/ActivityFeed.tsx - Feed list pattern
// 5. components/activity/Timeline.tsx - Timeline display
// 6. components/common/Pagination.tsx - Pagination component
// 7. app/(public)/changelog/page.tsx - Changelog page
// 8. app/api/changelog/route.ts - Changelog API
// 9. services/changelogService.ts - Changelog service
// 10. types/changelog.ts - Changelog types
// 11. prisma/schema.prisma - ChangelogEntry model
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - entries: ChangelogEntry[]
// - isLoading?: boolean
// - filter?: ChangelogFilter
// - onFilterChange?: (filter: ChangelogFilter) => void
// - showFilters?: boolean

// FEATURES:
// - Chronological list of changes
// - Group by version or date
// - Filter by type (feature, bugfix, etc.)
// - Pagination
// - Loading skeleton
