# 🔧 Environment Variables Reference

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

All environment variables for ProgressTracker, explained.

---

## 🔑 Critical Variables (Always Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | Output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App public URL | `https://vriddhi-app.vercel.app` |
| `ENCRYPTION_KEY` | AES encryption key (min 32 chars) | Output of `openssl rand -base64 32` |

---

## 🗄️ Database & Cache

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Primary DB connection | ✅ |
| `DIRECT_DATABASE_URL` | Direct connection (for migrations on Neon) | For Neon |
| `UPSTASH_REDIS_REST_URL` | Redis URL | For rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | For rate limiting |

---

## 🔐 Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_SECRET` | Session signing secret | ✅ |
| `NEXTAUTH_URL` | App public URL for callbacks | ✅ |
| `SESSION_MAX_AGE` | Session duration in seconds (default: 2592000 = 30 days) | Optional |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | Optional |

---

## 🔑 OAuth Providers

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID | For GitHub login |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret | For GitHub login |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | For Google login |

**Set up GitHub OAuth:**
1. GitHub → Settings → Developer settings → OAuth Apps → New
2. Homepage URL: `https://vriddhi-app.vercel.app`
3. Callback URL: `https://vriddhi-app.vercel.app/api/auth/callback/github`

---

## 📧 Email (Brevo)

| Variable | Description | Required |
|----------|-------------|----------|
| `BREVO_API_KEY` | Brevo API key | For emails |
| `BREVO_EMAIL` | Sender email | For emails |
| `EMAIL_FROM_NAME` | Sender display name | Optional |
| `NEWSLETTER_LIST_ID` | Brevo list ID for newsletter | For newsletter |

**Get Brevo API Key:**
1. Sign up at [brevo.com](https://brevo.com)
2. Settings → API Keys → Generate

---

## 💳 Stripe Billing

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | For billing |
| `STRIPE_PRO_PRICE_ID` | Product price ID | For billing |
| `STRIPE_STARTER_PRICE_ID` | Product price ID | For billing |

---

## 🎯 Background Jobs (Trigger.dev)

| Variable | Description | Required |
|----------|-------------|----------|
| `TRIGGER_SECRET_KEY` | Trigger.dev project secret | For background jobs |

---

## 📊 Monitoring (Sentry)

| Variable | Description | Required |
|----------|-------------|----------|
| `SENTRY_DSN` | Sentry error tracking DSN | For monitoring |
| `SENTRY_AUTH_TOKEN` | For uploading source maps | For monitoring |

---

## 🔔 Web Push Notifications (VAPID)

Generate key pair:
```bash
npx web-push generate-vapid-keys
```

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same public key (for client) |

---

## 📂 File Storage (Supabase)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SUPABASE_BUCKET_NAME` | Storage bucket name |

---

## 📎 Related Docs

- [Local Setup](01-local-setup.md)
- [Vercel Deployment](03-vercel-deployment.md)
- [.env.example](../../.env.example)
