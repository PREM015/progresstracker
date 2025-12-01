# Deployment guidance — Azure target topology

This document gives a concise recommended Azure deployment plan for the ProgressTracker application (Next.js app + Trigger.dev + scrapers + PostgreSQL + Redis + object storage).

High-level mapping (recommended):

- Next.js Web App
  - Option A (recommended for ease): Deploy to Vercel (managed) — keep server-side rendering and edge benefits.
  - Option B: Deploy Next.js to Azure App Service for a single-cloud deployment.

- Background tasks / Trigger.dev
  - Short tasks / event-driven: Azure Functions (serverless) — keep Trigger.dev pointing at function endpoints.
  - Long-running or stateful tasks: Azure Container Apps / AKS depending on scale.

- Scrapers (high scale, independent workers)
  - Use AKS for autoscaling, or Azure Container Apps for simpler container orchestration.

- Persistence
  - PostgreSQL: Azure Database for PostgreSQL (Flexible Server)
  - Redis: Azure Cache for Redis
  - Object Storage: Azure Storage (Blob) — replace S3 if you prefer single-cloud infra

- Observability
  - Application Insights for telemetry; Sentry optionally for exception reporting.

- CI/CD
  - GitHub Actions for CI; Vercel or Azure Pipelines for deployment. Playwright E2E tests run in CI.

Sample Bicep skeleton (high-level)

```bicep
// bicep/main.bicep — skeleton resources
param location string = resourceGroup().location
param postgresAdmin string
param postgresPassword string
param redisSku string = 'Standard'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-03-01' = {
  name: 'pt-db'
  location: location
  properties: {
    administratorLogin: 'pt_admin'
    administratorLoginPassword: postgresPassword
    version: '14'
    storage: {
      storageSizeGB: 64
    }
  }
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
}

resource cache 'Microsoft.Cache/Redis@2023-04-01' = {
  name: 'pt-redis'
  location: location
  sku: {
    name: 'Standard'
    family: 'C'
    capacity: 1
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: 'ptstorage'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

// Add Container Apps / Functions / AKS resources depending on target
```

Terraform / Bicep notes

- Use `azurerm` provider (Terraform) or Bicep to provision database, Redis and storage.
- For sensitive secrets (DB password, redis keys) use Azure Key Vault or GitHub Secrets for CI.
- Consider private endpoints for DB and Redis in production to isolate network traffic.

Deployment checklist / next steps

1) Choose one target: single-cloud Azure or hybrid (Vercel + Azure).
2) Provision databases (Postgres, Redis) and storage with backup & monitoring enabled.
3) Configure secrets and private networking (Key Vault, private endpoints).
4) Deploy Next.js app and set environment variables (DATABASE_URL, REDIS_URL, S3 / STORAGE creds).
5) Provision background runtime (Functions / Container Apps / AKS) and connect Trigger.dev or queue processors.
6) Add monitoring & alerts (App Insights, Sentry, CI test coverage thresholds).

If you'd like, I can generate a full Bicep or Terraform module for a chosen variant and include example CI pipeline steps. Tell me which target variant to produce (Azure-only vs Vercel + Azure hybrid, and whether scrapers should be AKS or Container Apps).