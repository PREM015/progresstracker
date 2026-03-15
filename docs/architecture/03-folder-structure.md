# 📁 Folder Structure

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker follows a **feature-colocated** structure within the Next.js App Router pattern. Files related to the same feature are kept together.

---

## 🗂️ Complete Folder Structure

```
progresstracker/
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # Auth route group (no layout)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── verify-email/
│   │   ├── (dashboard)/               # Dashboard route group (with sidebar layout)
│   │   │   ├── dashboard/
│   │   │   ├── tracker/
│   │   │   ├── goals/
│   │   │   ├── achievements/
│   │   │   ├── platforms/
│   │   │   ├── analytics/
│   │   │   ├── leaderboard/
│   │   │   └── settings/
│   │   ├── api/                       # API route handlers
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/     # NextAuth dynamic route
│   │   │   ├── tracker/
│   │   │   ├── platforms/
│   │   │   ├── sync/
│   │   │   ├── goals/
│   │   │   ├── achievements/
│   │   │   ├── stats/
│   │   │   ├── notifications/
│   │   │   ├── billing/
│   │   │   └── export/
│   │   ├── layout.tsx                 # Root layout (providers, fonts)
│   │   └── page.tsx                   # Landing page
│   │
│   ├── components/                    # React components
│   │   ├── auth/                      # Login, register forms
│   │   ├── dashboard/                 # Dashboard widgets
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ActivityHeatmap.tsx
│   │   │   ├── StreakDisplay.tsx
│   │   │   └── ...
│   │   ├── goals/                     # Goal management UI
│   │   ├── platforms/                 # Platform connection UI
│   │   ├── shared/                    # Shared across features
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   └── ui/                        # Base UI primitives (shadcn/ui)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── lib/                           # Core utilities
│   │   ├── auth.ts                    # NextAuth config + options
│   │   ├── database.ts                # Prisma client singleton
│   │   ├── redis.ts                   # Upstash Redis client
│   │   ├── crypto.ts                  # Encryption/decryption
│   │   ├── totp.ts                    # TOTP for 2FA
│   │   ├── rateLimit.ts               # Rate limiting middleware
│   │   ├── email/                     # Email service
│   │   │   ├── brevo.ts               # Brevo API client
│   │   │   └── templates/             # HTML email templates
│   │   └── utils.ts                   # General utilities
│   │
│   ├── services/                      # Business logic layer
│   │   ├── authService.ts             # Auth operations
│   │   ├── syncService.ts             # Platform sync orchestration
│   │   ├── statsService.ts            # Stats calculation
│   │   ├── streakService.ts           # Streak tracking
│   │   ├── achievementService.ts      # Achievement unlock logic
│   │   ├── notificationService.ts     # Notification dispatch
│   │   ├── billingService.ts          # Stripe operations
│   │   ├── exportService.ts           # Data export
│   │   └── scrapers/                  # Platform-specific scrapers
│   │       ├── githubScraper.ts
│   │       ├── leetcodeScraper.ts
│   │       └── ...
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useStats.ts
│   │   ├── useGoals.ts
│   │   └── ...
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   ├── sync.ts
│   │   └── index.ts
│   │
│   └── trigger/                       # Background job definitions
│       ├── syncJobs.ts
│       ├── emailJobs.ts
│       └── cleanupJobs.ts
│
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── seed.ts                        # Database seeder
│   └── migrations/                    # Migration files
│
├── docs/                              # Documentation (this folder!)
├── public/                            # Static files
│   ├── images/
│   └── icons/
├── .github/                           # GitHub templates & workflows
├── .env.example                       # Environment variable template
├── next.config.ts                     # Next.js configuration
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind CSS config
├── jest.config.js                     # Jest test config
└── playwright.config.ts               # E2E test config
```

---

## 🏛️ Architectural Decisions

### Route Groups

Next.js route groups `(groupName)` allow shared layouts without affecting URLs:

```
(auth)/login     → URL: /login (uses auth layout with centered card)
(dashboard)/     → URL: /dashboard (uses sidebar layout)
```

### Services vs API Routes

- **API Routes** = HTTP handlers (validation, auth, response formatting)
- **Services** = Business logic (can be called by API routes OR background jobs)

This separation allows reusing business logic in Trigger.dev jobs.

### Component Organization

```
components/
├── auth/          # Only used in auth pages
├── dashboard/     # Only used in dashboard
├── shared/        # Used across multiple features (Navbar, etc.)
└── ui/            # Design system primitives (never contain business logic)
```

---

## 📎 Related Docs

- [System Overview](01-system-overview.md)
- [Tech Stack](02-tech-stack.md)
