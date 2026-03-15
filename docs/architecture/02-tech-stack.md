# 🛠️ Tech Stack

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0
> **Status**: Published

## 📋 Table of Contents

- [Overview](#overview)
- [Frontend](#frontend)
- [Backend](#backend)
- [Database & Cache](#database--cache)
- [Authentication](#authentication)
- [DevOps & Infrastructure](#devops--infrastructure)
- [Third-party Services](#third-party-services)
- [Development Tools](#development-tools)

---

## 🎯 Overview

ProgressTracker is built with a **modern, TypeScript-first** stack optimized for developer experience, type safety, and Vercel deployment.

---

## 🎨 Frontend

### Next.js 14 (App Router)

**Why Next.js?**
- Server-side rendering for SEO and performance
- App Router for nested layouts and streaming
- Built-in API routes (no separate backend needed)
- Vercel-optimized deployment

**Why App Router (not Pages)?**
- React Server Components for zero-JS UI
- Streaming and Suspense boundaries
- Simplified data fetching patterns
- Better TypeScript integration

### React 18

- Concurrent features (useTransition, useDeferredValue)
- Automatic batching for performance

### TypeScript

All code is strictly typed:
- No `any` types in production code
- Prisma auto-generates database types
- API response types shared between frontend and backend

### Tailwind CSS 3

- Utility-first CSS eliminates unused styles
- JIT mode for instant dev server updates
- Custom design tokens in `tailwind.config.ts`
- Dark mode support via `class` strategy

### shadcn/ui

- Accessible, unstyled components
- Built on Radix UI primitives
- Customizable to match our design system
- Components copied into project (not a dependency)

### SWR (Data Fetching)

- Client-side data fetching with automatic revalidation
- Stale-while-revalidate strategy
- Optimistic UI updates
- Error retry with exponential backoff

### Framer Motion

- Smooth page transitions
- Micro-animations for achievements/streaks
- Gesture-based interactions

### Recharts

- SVG-based charts (heatmap, line, bar)
- Responsive containers
- Custom tooltip components

---

## ⚙️ Backend

### Next.js API Routes

**Why not a separate Express server?**
- Single deployment unit (simpler DevOps)
- Shared TypeScript types with frontend
- Vercel serverless functions auto-scaling
- No CORS configuration needed

### Prisma ORM

**Why Prisma?**
- Auto-generated TypeScript client
- Type-safe queries (catch SQL errors at compile time)
- Migrations with version control
- Schema-as-code approach

```typescript
// Type-safe query example
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { goals: true, achievements: true }
});
// user is fully typed!
```

### Zod (Validation)

- Runtime schema validation for all API inputs
- Type inference for TypeScript types
- Clear error messages for invalid input

### Trigger.dev (Background Jobs)

- Reliable job scheduling (replaces cron + queue)
- TypeScript-first job definitions
- Built-in retry logic and error handling
- Visual job monitoring dashboard

---

## 🗄️ Database & Cache

### PostgreSQL (via Neon/Supabase)

**Why PostgreSQL?**
- ACID transactions for financial data (billing)
- JSON support for flexible metadata
- Full-text search built-in
- Excellent Prisma support
- Mature ecosystem

### Upstash Redis

**Why Redis?**
- Ultra-fast in-memory cache
- Rate limiting (sliding window)
- Session storage fallback
- Pub/Sub for real-time features (future)

**Upstash specifically:**
- Serverless-friendly (HTTP API, no persistent connection)
- Free tier for development
- Auto-scaling

---

## 🔐 Authentication

### NextAuth.js v4

- Battle-tested auth library for Next.js
- Built-in OAuth providers (GitHub, Google)
- Session management with JWT or database sessions
- CSRF protection built-in

### bcryptjs

- Password hashing (12 salt rounds)
- Pure JavaScript (no native dependencies)
- Works in all environments

### Custom 2FA (TOTP)

- Time-based one-time passwords
- Custom implementation (no `otplib` dependency issues)
- QR code generation for authenticator apps

---

## 🚀 DevOps & Infrastructure

### Vercel

- Zero-config Next.js deployment
- Preview deployments for PRs
- Edge Network for global CDN
- Serverless function auto-scaling

### GitHub Actions

- CI/CD pipeline (lint, type-check, test, build)
- Automated deployment on merge to main
- Dependency security scanning

### Sentry

- Error tracking and performance monitoring
- Source maps for readable stack traces
- Alert rules for critical errors

---

## 🔌 Third-party Services

| Service | Purpose | SDK |
|---------|---------|-----|
| **Stripe** | Payments & subscriptions | `stripe` |
| **Brevo** | Transactional email | `@getbrevo/brevo` |
| **Supabase Storage** | File storage (exports) | `@supabase/supabase-js` |
| **Sentry** | Error monitoring | `@sentry/nextjs` |
| **Trigger.dev** | Background jobs | `@trigger.dev/sdk` |

---

## 🛠️ Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks (pre-commit lint) |
| **Jest** | Unit and integration tests |
| **Playwright** | E2E tests |
| **Prisma Studio** | Database GUI |
| **tsx** | TypeScript script execution |

---

## 📎 Related Docs

- [System Overview](01-system-overview.md)
- [Folder Structure](03-folder-structure.md)
- [Local Setup](../deployment/01-local-setup.md)
