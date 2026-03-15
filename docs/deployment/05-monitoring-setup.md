# 📊 Monitoring Setup

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Monitoring Stack

| Tool | Purpose | URL |
|------|---------|-----|
| **Sentry** | Error tracking | [sentry.io](https://sentry.io) |
| **Vercel Analytics** | Performance metrics | Vercel dashboard |
| **Trigger.dev** | Background job monitoring | [trigger.dev](https://trigger.dev) |
| **Upstash** | Redis metrics | Upstash dashboard |

---

## 🔴 Sentry Setup

### 1. Create Project

1. Sign up at [sentry.io](https://sentry.io)
2. New Project → Next.js
3. Copy DSN

### 2. Configure

```env
SENTRY_DSN=https://xxx@oxx.ingest.sentry.io/yyy
SENTRY_AUTH_TOKEN=sntrys_xxx  # For source maps
```

Sentry is already configured in:
- `sentry.server.config.ts` - Server-side errors
- `sentry.edge.config.ts` - Edge function errors
- `next.config.ts` - Sentry webpack plugin

### 3. Alert Rules

Set up alerts in Sentry for:
- Error spike (>10 errors/hour)
- New error type
- Performance degradation (p95 > 2s)

---

## 📈 Vercel Analytics

Built-in with Vercel Pro:
- Page load times
- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)

Enable in `next.config.ts`:
```typescript
const config: NextConfig = {
  experimental: { instrumentationHook: true }
};
```

---

## ⏰ Trigger.dev Job Monitoring

Monitor background jobs at:
- [cloud.trigger.dev](https://cloud.trigger.dev)

View:
- Job run history
- Failed runs with error messages
- Job execution time
- Retry attempts

---

## 🚨 Alert Escalation

| Severity | Alert | Response Time |
|----------|-------|--------------|
| P0 - Critical | Sentry + PagerDuty | 15 min |
| P1 - High | Sentry email | 1 hour |
| P2 - Medium | Sentry digest | 24 hours |

---

## 📎 Related Docs

- [Vercel Deployment](03-vercel-deployment.md)
- [Security Overview](../security/01-security-overview.md)
