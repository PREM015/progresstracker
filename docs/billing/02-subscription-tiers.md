# 💰 Subscription Tiers

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 📊 Plan Comparison

| Feature | Free | Starter | Pro | Team | Enterprise |
|---------|------|---------|-----|------|-----------|
| **Platforms** | 3 | 10 | Unlimited | Unlimited | Custom |
| **Goals** | 1 | 5 | Unlimited | Unlimited | Custom |
| **Sync Frequency** | Manual | 12h | 6h | 1h | Real-time |
| **History** | 30 days | 90 days | 1 year | Unlimited | Unlimited |
| **Data Export** | ❌ | CSV | CSV/JSON/PDF | All formats | All formats |
| **API Access** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Streak Freeze** | ❌ | 1/mo | 2/mo | 5/mo | Unlimited |
| **Public Profile** | ✅ | ✅ | ✅ (custom) | ✅ | ✅ |
| **Weekly Reports** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Team Dashboard** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | Email | Email+Chat | Dedicated |
| **Price (monthly)** | Free | $4.99 | $9.99 | $24.99/5 users | Custom |
| **Price (yearly)** | Free | $39.99 | $79.99 | $199.99/5 users | Custom |

---

## 🎯 Which Plan Do I Need?

**Free**: Personal use, casual tracking, just getting started.

**Starter**: Connect multiple platforms, set goals, get weekly reports.

**Pro**: Power users who want full data history, API access, advanced exports, and more sync frequency.

**Team**: Companies and study groups wanting shared dashboards and team analytics.

**Enterprise**: Organizations needing custom limits, SLA guarantees, and dedicated support.

---

## ⚙️ Plan Limits Enforcement

Limits are enforced server-side:

```typescript
// Middleware to check plan limits
async function checkPlanLimit(userId: string, feature: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { include: { tier: true } } }
  });
  
  const tier = user.subscription?.tier?.name ?? 'FREE';
  return TIER_LIMITS[tier][feature];
}
```

---

## 📎 Related Docs

- [Stripe Integration](01-stripe-integration.md)
- [Payment Flows](03-payment-flows.md)
