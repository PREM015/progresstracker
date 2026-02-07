// ============================================================================
// FILE: components/waitlist/WaitlistForm.tsx
// PURPOSE: Waitlist signup form
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. components/public/WaitlistPage.tsx - Waitlist page component
// 2. components/auth/RegisterForm.tsx - Form pattern with validation
// 3. components/auth/LoginForm.tsx - Form pattern
// 4. components/landing/Newsletter.tsx - Email signup pattern
// 5. components/forms/FormInput.tsx - Form input component
// 6. app/(public)/waitlist/page.tsx - Waitlist page
// 7. app/api/waitlist/join/route.ts - Join waitlist API
// 8. app/api/waitlist/route.ts - Waitlist API
// 9. services/waitlistService.ts - Waitlist service
// 10. types/waitlist.ts - Waitlist types
// 11. lib/validators.ts - Email validation
// -----------------------------------------------------------------------------

// PROPS TO IMPLEMENT:
// - onSuccess?: (position: number) => void
// - referralCode?: string
// - source?: string
// - showReferral?: boolean

// FEATURES:
// - Email input with validation
// - Optional name field
// - Referral code input
// - Loading state
// - Success callback with position
// - Error handling
