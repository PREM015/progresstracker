# 📋 Changelog

All notable changes to **ProgressTracker** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Mobile app (React Native)
- Team/Group tracking
- AI-powered insights
- Browser extension

---

## [1.5.0] - 2026-03-15

### Added
- Brevo email service integration (`@getbrevo/brevo` SDK)
- Custom TOTP utility for 2FA (replacing deprecated `otplib`)
- Enhanced security audit logging
- Redis caching for API routes
- Supabase Storage integration for file exports

### Changed
- Removed deprecated `sib-api-v3-sdk` package
- Updated Next.js configuration for better performance
- Improved error handling in sync service
- Enhanced email templates with better HTML

### Fixed
- Build errors due to `otplib` import issues
- Email verification flow not working correctly
- Stripe webhook signature validation
- Session management token refresh issues

### Security
- Removed vulnerable dependencies (npm audit fix)
- Updated bcryptjs to latest version
- Added rate limiting to auth endpoints

---

## [1.4.0] - 2026-02-28

### Added
- Two-factor authentication (TOTP)
- Backup codes for 2FA recovery
- Active session management (view/revoke sessions)
- Email change request flow with dual verification
- Referral system with reward tracking

### Changed
- Improved streak calculation algorithm
- Better handling of timezone-aware dates
- Enhanced leaderboard queries with caching

### Fixed
- Streak not updating on platform sync
- Goals progress calculation edge cases
- Achievement unlock race conditions

---

## [1.3.0] - 2026-02-10

### Added
- Stripe billing integration
- Subscription tiers (Free, Starter, Pro, Team, Enterprise)
- Invoice generation and management
- Coupon and discount code system
- Payment webhook handling

### Changed
- Dashboard performance improvements
- Reduced database queries with joins
- Better error messages in UI

### Fixed
- Platform sync failing on rate limit
- Memory leak in background jobs
- OAuth token refresh not working

---

## [1.2.0] - 2026-01-20

### Added
- Goal system with milestones
- Achievement/badge system with 50+ achievements
- Weekly email reports (via Trigger.dev)
- Data export (CSV, JSON, PDF)
- Share profile as public link
- Leaderboard (global and platform-specific)

### Changed
- Redesigned dashboard with better UX
- Improved mobile responsiveness
- Faster page loads with SWR caching

### Fixed
- LeetCode sync parsing errors
- GitHub contribution graph alignment
- Notification preferences not saving

---

## [1.1.0] - 2026-01-05

### Added
- Google OAuth login
- Dark mode toggle
- Activity heatmap (GitHub-style)
- Notification system (in-app + email)
- Push notifications (VAPID)
- HackerRank platform sync

### Changed
- Better onboarding flow
- Improved platform connection UI
- Enhanced error messages

### Fixed
- Session timeout issues
- Platform sync rate limiting
- Email verification link expiry

---

## [1.0.0] - 2025-12-15

### 🎉 Initial Release

### Added
- User authentication (email + GitHub OAuth)
- Manual activity tracking
- LeetCode, GitHub, CodeForces platform sync
- Basic dashboard with stats
- Streak tracking
- Problem solving logs
- User settings and preferences
- API key management
- Basic notification system

---

## Migration Notes

### v1.4.x → v1.5.x

```bash
# Update dependencies
npm install

# Run database migrations
npm run prisma:migrate

# Update environment variables
# - Add BREVO_API_KEY
# - Remove SMTP_* variables (if using old email setup)
```

### v1.3.x → v1.4.x

```bash
# New 2FA tables added
npm run prisma:migrate

# Enable 2FA in settings
# Users can opt-in via /settings/security
```

---

[Unreleased]: https://github.com/PREM015/progresstracker/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/PREM015/progresstracker/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/PREM015/progresstracker/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/PREM015/progresstracker/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/PREM015/progresstracker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/PREM015/progresstracker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/PREM015/progresstracker/releases/tag/v1.0.0
