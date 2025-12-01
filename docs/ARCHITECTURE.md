# Architecture Overview

This document provides a complete, practical architecture overview for ProgressTracker — listing the components, folder layout, dataflows, config points and where each part runs in production.

Files added:

- `.azure/architecture.copilotmd` — the full Mermaid diagram (open with a Mermaid preview extension to render).

High-level summary
------------------

ProgressTracker is a full-stack application built on modern Next.js (app dir + API routes) with these principal capabilities:

- User-facing front-end (Next.js) and HTTP API endpoints.
- Background processing: Trigger.dev (task runtime + scheduled workflows) and separate scraper/worker processes for large, long-running or rate-limited scraping tasks.
- Persistent storage: PostgreSQL (Prisma) as the primary DB, Redis for queueing and short-term cache, and an object store (S3) for uploads and export artifacts.
- Third-party integrations: OAuth providers and platform scraping (GitHub, LinkedIn, LeetCode, etc.).
- CI/CD: GitHub Actions builds, Playwright E2E runs, and deployment to Vercel.

Rendered architecture
---------------------

Open the generated Mermaid diagram at `.azure/architecture.copilotmd` to view the full picture (mermaid preview recommended). The diagram models compute surfaces, CI/CD, datastore and external integration flows.

Why this layout
---------------

The repository contains a separation of concerns:

- src/app — Next.js pages & API routes. The API routes provide REST endpoints used by the frontend and scheduled jobs.
- src/trigger — Trigger.dev based tasks and long-running workflows (cron and background scheduled jobs).
- src/services — business/service logic: auth, user, tracker, sync, scrapers and exporters. Scrapers are grouped under `src/services/scrapers`.
- src/lib — shared utilities (auth, prisma client, logging, rate limiters).
- prisma — Prisma schema and DB migrations (DATABASE_URL environment variable).
- tests — unit, integration, and E2E (Playwright) tests used by CI.

Project folder map (top-level important folders)
-----------------------------------------------

```
/
├── src/
│   ├── app/                   # Next.js app + API routes (src/app/api/*)
│   ├── components/            # React components
│   ├── services/              # Service layer (core logic)
│   │   ├── scrapers/          # Platform scrapers and adapters
│   │   ├── exportService.ts
│   │   ├── syncService.ts
│   │   └── ...
│   ├── trigger/               # Trigger.dev tasks & scheduled workflows
│   ├── lib/                   # Utilities (prisma, logger, redis, auth helpers)
│   └── generated/             # Prisma client output
├── prisma/                    # Prisma schema (postgres DB connection via DATABASE_URL)
├── docs/                      # Project documentation incl. ARCHITECTURE.md
├── .github/workflows/         # CI / GitHub Actions (tests, build, deploy)
├── vercel.json                # Vercel app config + cron definitions
└── package.json               # dependencies (Next, Prisma, Trigger.dev, Bull, S3 SDK, etc.)
```

Important configuration and env points
-------------------------------------

- prisma/schema.prisma — datasource configured as PostgreSQL (env: DATABASE_URL). This is your primary storage.
- package.json — contains dependencies: @prisma/client, bull, redis, @aws-sdk/client-s3, trigger.dev and next.
- trigger.config.ts — config for Trigger.dev tasks (runtime: node and directories under src/trigger).
- vercel.json — configuration for Vercel hosting and cron endpoints (e.g., /api/cron/daily-sync).
- .github/workflows — GitHub Actions used for CI (lint, tests, Playwright e2e, optionally deploy to Vercel).

Detailed data flow (how pieces interact)
--------------------------------------

1) User interactions & API:
	- The Next.js front-end (hosted on Vercel) serves pages and calls API routes in src/app/api/*.
	- API routes read/write domain data in PostgreSQL via Prisma.
	- When a job is required (e.g., long running export or scraping), the app enqueues work into Redis/Bull.

2) Background processing & scheduled tasks:
	- Trigger.dev and dedicated worker containers process background flows, consume job queues and perform heavy tasks (long scrapes, data normalization, exports).
	- Trigger.dev tasks and scrapers call external platform APIs (OAuth-protected endpoints) and write consolidated results into the DB.
	- Export flows use S3 to store generated CSV/PDF/JSON artefacts for users.

3) Scrapers & external integration:
	- Scrapers are modular and map to the platform adapters under src/services/scrapers.
	- Each scraper contacts external platform endpoints and is rate-limited / retried via queue workers.

4) CI/CD and tests:
	- GitHub Actions run unit, integration and Playwright tests. Successful builds push/deploy to Vercel.

Notes, recommendations and next steps
------------------------------------

- If you want a production-grade Azure topology, recommended mapping is:
  - Next.js (Vercel or Static Web App / App Service for SSR),
  - Trigger.dev -> Container Apps (or Azure Functions for short, quick tasks),
  - Scrapers -> Container Apps or AKS (if you need autoscaling and advanced network controls),
  - PostgreSQL -> Azure Database for PostgreSQL,
  - Redis -> Azure Cache for Redis,
  - S3 stays as AWS S3 (or migrate to Azure Storage if you prefer a single-cloud deployment).

- Want an image export? I can export the Mermaid graph to a PNG/SVG and commit it to `docs/` if you'd like.

---

If you want the diagram changed (for example: map Trigger.dev -> Function App, split scrapers into a separate AKS cluster, or show private networking and private endpoints) tell me the preferred target and I will update the diagram and deployment notes.

Rendered assets & variants
--------------------------

- `docs/DIAGRAMS_RENDERING.md` — instructions and npm scripts to export the Mermaid diagram to `docs/architecture.svg` and `docs/architecture.png` using `@mermaid-js/mermaid-cli` (`npx` works, no global install required).
- `.azure/architecture-azure.copilotmd` — an alternate Mermaid diagram that maps Trigger.dev -> Azure Functions and scrapers -> AKS (useful when targeting Azure-only deployments).
- `docs/DEPLOYMENT-AZURE.md` — concise Azure deployment guidance and a sample Bicep skeleton to get started.
