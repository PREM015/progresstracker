# 🔧 Troubleshooting Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🐛 Common Issues

---

### 🔌 Database Connection Issues

**Error**: `PrismaClientInitializationError: Can't reach database server`

**Solutions**:
1. Check `DATABASE_URL` format:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
   ```
2. Ensure database server is running
3. Check firewall rules (allow connections from Vercel IP ranges)
4. For Neon: ensure branch is not suspended

---

### 🔐 Authentication Issues

**Problem**: Can't login, redirected back to `/login`

**Check**:
1. `NEXTAUTH_SECRET` must be at least 32 characters
2. `NEXTAUTH_URL` must match your actual URL (no trailing slash)
3. OAuth callback URLs must match exactly

```bash
# Verify your env vars
echo $NEXTAUTH_URL
echo ${#NEXTAUTH_SECRET}  # Should be 32+
```

**Problem**: OAuth login fails (GitHub/Google)

1. Check callback URL in GitHub/Google OAuth settings
2. URL format: `https://yourapp.com/api/auth/callback/github`
3. Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct

---

### 🔄 Sync Issues

**Problem**: Platform sync returns 0 data

1. Check platform credentials are valid (Settings → Platforms → Test)
2. Ensure API key hasn't expired
3. For LeetCode/Codeforces: profile must be **public**
4. Check SyncLog for error details: `GET /api/sync/logs`

**Problem**: "Sync failed" error in UI

1. Check Trigger.dev dashboard for job errors
2. Verify `TRIGGER_SECRET_KEY` is set correctly
3. Check `ENCRYPTION_KEY` is set (needed to decrypt stored OAuth tokens)

---

### 💳 Billing Issues

**Problem**: Webhook events not received

1. Check `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret in Stripe dashboard
2. Verify webhook URL: `https://yourapp.com/api/billing/webhook`
3. Check Stripe webhook logs for delivery failures

**Problem**: Subscription not activating after payment

1. Check Vercel function logs for webhook handler errors
2. Verify `STRIPE_SECRET_KEY` starts with `sk_` (not `pk_`)

---

### 📧 Email Issues

**Problem**: Verification emails not arriving

1. Check `BREVO_API_KEY` is set and valid
2. Verify sender email is validated in Brevo
3. Check Brevo dashboard for bounce/spam reports
4. Check spam folder

---

### 🏗️ Build Issues

**Problem**: `Module not found` errors

```bash
# Regenerate Prisma client
npm run prisma:generate

# Clear Next.js cache
rm -rf .next
npm run build
```

**Problem**: TypeScript errors in build

```bash
npm run type-check
```

---

### 🚀 Vercel Deployment Issues

**Problem**: Build fails on Vercel

1. Check that `npm run prisma:generate` is in the build command
2. Verify all required environment variables are set
3. Check build logs for specific errors

---

## 🆘 Getting Help

1. Check this guide first
2. Search [GitHub Issues](https://github.com/PREM015/progresstracker/issues)
3. Open a new issue with error logs
4. Email: support@progresstracker.app

---

## 📎 Related Docs

- [Local Setup](../deployment/01-local-setup.md)
- [Environment Variables](../deployment/02-environment-variables.md)
- [Sync Troubleshooting](../sync/04-sync-troubleshooting.md)
