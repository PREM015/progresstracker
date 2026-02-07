// ============================================================================
// FILE: components/changelog/ChangelogItem.tsx
// PURPOSE: Individual changelog entry display
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/public/ChangelogEntry.tsx - Existing changelog entry
// 2. components/activity/ActivityItem.tsx - Activity item pattern
// 3. components/activity/TimelineItem.tsx - Timeline item pattern
// 4. components/public/BlogPost.tsx - Blog post display
// 5. components/common/Badge.tsx - Type badges
// 6. types/changelog.ts - Changelog types
// 7. prisma/schema.prisma - ChangelogEntry model
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - entry: ChangelogEntry
// - expanded?: boolean
// - onToggle?: () => void
// - showVersion?: boolean

// FEATURES:
// - Version number and date
// - Type badge (feature, bugfix, improvement)
// - Title and description
// - List of changes
// - Expandable/collapsible
