# 📊 Analytics Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Analytics Stack

| Tool | Purpose |
|------|---------|
| **Vercel Analytics** | Page views, Core Web Vitals |
| **Sentry** | Error rates, performance traces |
| **Custom DB** | User behavior analytics |

---

## 📈 Key Metrics Tracked

### Product Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- User retention (D1, D7, D30)
- Feature adoption (% users using goals, sync, etc.)

### Technical Metrics
- API response times (p50, p95, p99)
- Error rate
- Build times
- Sync success rate

### Business Metrics
- Free-to-paid conversion rate
- Monthly Recurring Revenue (MRR)
- Churn rate
- Average Revenue Per User (ARPU)

---

## 🔍 User Event Tracking

Important user events logged in `AuditLog`:

```typescript
// Track feature usage
await log(userId, 'SYNC_TRIGGER', { platform: 'github' });
await log(userId, 'EXPORT_DATA', { format: 'CSV' });
await log(userId, 'SHARE_CREATE', { slug: 'custom-slug' });
```

---

## 📊 Vercel Analytics Setup

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 📎 Related Docs

- [Monitoring Setup](../deployment/05-monitoring-setup.md)
- [Security Overview](../security/01-security-overview.md)
