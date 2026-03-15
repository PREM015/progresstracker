# 🏛️ Design Decisions (ADR)

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0
> Architecture Decision Records for ProgressTracker

---

## ADR-001: Next.js App Router over Pages Router

**Status**: ✅ Accepted

**Decision**: Use Next.js 14 App Router instead of the legacy Pages Router.

**Rationale**:
- React Server Components reduce client-side JS bundle
- Nested layouts enable complex dashboard UI patterns
- Streaming and Suspense for better perceived performance
- Future-proof (Pages Router is in maintenance mode)

**Trade-offs**:
- Steeper learning curve
- Some libraries don't support RSC yet (worked around with `'use client'`)

---

## ADR-002: Prisma over Raw SQL / Drizzle

**Status**: ✅ Accepted

**Decision**: Use Prisma ORM as the database access layer.

**Rationale**:
- Full TypeScript type safety for all database models
- Auto-generated client reduces boilerplate
- Excellent migration tooling
- Strong community and documentation

**Trade-offs**:
- Slightly slower than raw SQL for complex queries
- Prisma client bundle size (mitigated by server-side only usage)

---

## ADR-003: Upstash Redis over Self-Hosted

**Status**: ✅ Accepted

**Decision**: Use Upstash managed Redis instead of a self-hosted instance.

**Rationale**:
- HTTP-based API works with Vercel serverless functions (no persistent connection)
- No infrastructure to manage
- Auto-scaling, built-in persistence
- Free tier sufficient for development

---

## ADR-004: Brevo over SendGrid for Email

**Status**: ✅ Accepted

**Decision**: Use Brevo (`@getbrevo/brevo`) for transactional email.

**Rationale**:
- Generous free tier (300 emails/day)
- Good deliverability
- Newsletter/list management built-in
- Simple REST API

**Previous**: Used `sib-api-v3-sdk` which was deprecated in favor of `@getbrevo/brevo`.

---

## ADR-005: Custom TOTP over otplib

**Status**: ✅ Accepted

**Decision**: Implement a custom TOTP utility instead of using `otplib`.

**Rationale**:
- `otplib` caused import errors in Next.js build
- Custom implementation gives full control
- TOTP algorithm is simple enough (RFC 6238)
- Eliminates a dependency

---

## ADR-006: Trigger.dev for Background Jobs

**Status**: ✅ Accepted

**Decision**: Use Trigger.dev for scheduled and event-driven jobs.

**Rationale**:
- TypeScript-first job definitions
- Built-in retry logic and error handling
- No separate infrastructure (integrates with existing Next.js app)
- Visual dashboard for monitoring jobs

**Alternative considered**: Vercel Cron + BullMQ (more complex setup)

---

## ADR-007: SWR for Client Data Fetching

**Status**: ✅ Accepted

**Decision**: Use SWR for client-side data fetching.

**Rationale**:
- Stale-while-revalidate gives instant UX with background refresh
- Simple API with hooks
- Good integration with Next.js
- Optimistic updates support

---

## ADR-008: Monorepo (Single Next.js App)

**Status**: ✅ Accepted

**Decision**: Keep everything in a single Next.js app rather than microservices.

**Rationale**:
- Simpler deployment (single Vercel project)
- Shared TypeScript types between frontend and backend
- Easier to develop solo/small team
- Can always extract services later

**Trade-offs**:
- Less isolation between features
- All features scale together (not independently)
