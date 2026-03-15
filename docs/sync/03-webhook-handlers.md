# 🔗 Webhook Handlers

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker handles two types of webhooks:
1. **Incoming webhooks** from external platforms (GitHub, Stripe)
2. **Outgoing webhooks** that notify user systems of events

---

## 📥 Incoming Webhooks

### GitHub Webhook

Receives push events to update commits in real-time:

```
POST /api/webhooks/github
Headers: X-Hub-Signature-256: sha256=<signature>
```

**Validation**: HMAC signature with `GITHUB_WEBHOOK_SECRET`

```typescript
function verifyGitHubSignature(payload: string, signature: string): boolean {
  const expected = `sha256=${createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Stripe Webhook

Handles payment events:

```
POST /api/billing/webhook
Headers: Stripe-Signature: t=...,v1=...
```

**Events handled:**
| Stripe Event | Our Action |
|-------------|------------|
| `checkout.session.completed` | Activate subscription |
| `invoice.payment_succeeded` | Extend subscription |
| `invoice.payment_failed` | Mark past_due, notify user |
| `customer.subscription.deleted` | Downgrade to Free |
| `customer.subscription.updated` | Update tier |

---

## 📤 Outgoing Webhooks (User-Defined)

Users can configure webhooks to receive notifications from ProgressTracker (Pro+):

```json
// User creates webhook
POST /api/user/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["ENTRY_CREATED", "ACHIEVEMENT_UNLOCKED", "GOAL_COMPLETED"],
  "secret": "your-secret"
}
```

**Delivery**: POST to user's URL with signed payload:
```
X-ProgressTracker-Signature: sha256=<hmac>
```

---

## 📎 Related Docs

- [Sync Architecture](01-sync-architecture.md)
- [Billing Integration](../billing/01-stripe-integration.md)
