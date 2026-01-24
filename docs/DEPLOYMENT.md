# 🚀 Deployment Guide - Progress Tracker

Complete guide to deploy Progress Tracker to production using Vercel, Azure, or Docker.

**Last Updated:** January 25, 2026

---

## 🎯 Choose Your Deployment Method

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| **Vercel** | ⭐ Easy | Free tier available | Quick deployment, Next.js native |
| **Azure App Service** | ⭐⭐ Medium | Pay-as-you-go | Enterprise, custom domain |
| **Docker + AWS ECS** | ⭐⭐⭐ Hard | Varies | High traffic, scaling |

**Recommended for first deployment:** Vercel (simplest, fastest)

---

## 🟦 Deployment to Vercel (Easiest)

Vercel is optimized for Next.js and requires minimal configuration.

### Prerequisites

- Vercel account (free at https://vercel.com)
- GitHub, GitLab, or Bitbucket account
- This repository pushed to Git

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import Project on Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your Git provider (GitHub recommended)
4. Find and select "progresstracker" repository
5. Click "Import"

### Step 3: Configure Environment Variables

In the import dialog, add all variables from `.env.example`:

```
NEXTAUTH_SECRET=<generate-new-secret>
ENCRYPTION_KEY=<generate-new-key>
DATABASE_URL=<your-database-url>
GITHUB_CLIENT_ID=<your-id>
GITHUB_CLIENT_SECRET=<your-secret>
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>
UPSTASH_REDIS_REST_URL=<your-url>
UPSTASH_REDIS_REST_TOKEN=<your-token>
SENTRY_DSN=<your-sentry-dsn>
TRIGGER_SECRET_KEY=<your-trigger-key>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_S3_BUCKET=<your-bucket>
```

### Step 4: Configure Database

Your `DATABASE_URL` should be configured properly. For Vercel Postgres:

1. Click "Storage" in Vercel dashboard
2. Click "Create Database" → "Postgres"
3. Copy DATABASE_URL to environment variables

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Once domains show your URL, deployment is complete!

### Step 6: Run Database Migrations

After first deployment:

```bash
npm run prisma:migrate:deploy
```

### Verify Deployment

Your app is at: `https://<your-vercel-domain>.vercel.app`

Check:
1. Landing page loads
2. Can navigate to /login
3. Can sign up/sign in
4. Dashboard loads
