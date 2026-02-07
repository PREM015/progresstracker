// ============================================================================
// FILE: components/streak/StreakFreezeButton.tsx
// PURPOSE: Button to use streak freeze
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/streak/StreakCard.tsx - Parent component using this
// 2. components/common/ConfirmDialog.tsx - Confirmation dialog pattern
// 3. components/modals/ConfirmModal.tsx - Modal confirmation pattern
// 4. components/goals/GoalActions.tsx - Action button pattern
// 5. app/api/streak/freeze/route.ts - Freeze API endpoint
// 6. services/streakService.ts - Streak freeze logic
// 7. types/streak.ts - Streak type definitions
// 8. config/streak.ts - Streak freeze limits
// 9. lib/apiClient.ts - API client for requests
// 10. context/ToastContext.tsx - Toast notifications
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - freezesAvailable: number
// - freezesUsed: number
// - canFreeze: boolean
// - onFreezeSuccess?: () => void
// - disabled?: boolean
// - size?: 'sm' | 'md' | 'lg'

// FEATURES:
// - Show remaining freezes
// - Confirmation dialog before using
// - Loading state during API call
// - Success/error toast notifications
// - Disabled when no freezes available
