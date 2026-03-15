# 🚀 Vercel Deployment Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚡ One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PREM015/progresstracker)

---

## 🔧 Manual Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. New Project → Import from GitHub
3. Select `progresstracker` repository
4. **Framework Preset**: Next.js (auto-detected)

### Step 3: Configure Environment Variables

In Vercel dashboard, add all variables from `.env.example`:

```
Settings → Environment Variables → Add
```

Required for production:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your Vercel URL)
- `ENCRYPTION_KEY`
- `BREVO_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TRIGGER_SECRET_KEY`

### Step 4: Configure Build Command

In Vercel project settings:
```
Build Command: npm run prisma:generate && next build
Install Command: npm ci
```

Or use `vercel.json` (already configured in project):
```json
{
  "buildCommand": "npm run prisma:generate && next build"
}
```

### Step 5: Set Up Stripe Webhooks

After deploying:
1. Get your Vercel URL (e.g., `https://progresstracker.vercel.app`)
2. Go to Stripe Dashboard → Webhooks → Add endpoint
3. URL: `https://progresstracker.vercel.app/api/billing/webhook`
4. Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.*`
5. Copy webhook signing secret → Set as `STRIPE_WEBHOOK_SECRET`

### Step 6: Set Up GitHub Webhook (Optional)

For real-time GitHub sync:
1. GitHub repository → Settings → Webhooks → Add webhook
2. Payload URL: `https://yourapp.vercel.app/api/webhooks/github`
3. Content type: `application/json`
4. Secret: Set `GITHUB_WEBHOOK_SECRET` env var
5. Events: Push, Pull request

---

## 🔄 Preview Deployments

Vercel automatically creates preview URLs for PRs:
- `https://progresstracker-git-feature-prem015.vercel.app`

These use the same env vars but point to the preview database (configure if needed).

---

## 📎 Related Docs

- [Environment Variables](02-environment-variables.md)
- [Database Setup](04-database-setup.md)
- [Monitoring Setup](05-monitoring-setup.md)
