// ============================================================================
// FILE: components/maintenance/MaintenanceBanner.tsx
// PURPOSE: Banner showing maintenance status
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/admin/maintenance/MaintenanceBanner.tsx - Admin maintenance banner
// 2. components/admin/maintenance/MaintenanceActive.tsx - Active maintenance display
// 3. components/errors/MaintenancePage.tsx - Maintenance page
// 4. components/dashboard/WelcomeBanner.tsx - Banner component pattern
// 5. components/common/StatusIndicator.tsx - Status indicator
// 6. app/maintenance/page.tsx - Maintenance page
// 7. app/api/maintenance/route.ts - Maintenance API
// 8. services/maintenanceService.ts - Maintenance service
// 9. types/maintenance.ts - Maintenance types
// 10. prisma/schema.prisma - MaintenanceWindow model
// 11. context/RealtimeContext.tsx - Realtime updates for maintenance status
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - maintenance: MaintenanceInfo | null
// - position?: 'top' | 'bottom'
// - dismissible?: boolean
// - onDismiss?: () => void

// FEATURES:
// - Show maintenance title and message
// - Estimated end time with countdown
// - Auto-dismiss when maintenance ends
// - Affected services list
// - Different styles for scheduled vs active
