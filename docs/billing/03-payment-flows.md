# 💸 Payment Flows

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔄 Payment Flow Types

### 1. New Subscription

```
User → Select plan → Stripe Checkout → Payment info → Success → Subscription active
```

### 2. Upgrade

```
User → Change plan → Stripe prorated immediately → Webhook → Update DB tier
```

### 3. Downgrade

```
User → Change plan → Scheduled for next billing period → Webhook at renewal → Update DB
```

### 4. Cancellation

```
User → Cancel → Access continues until period end → Webhook at period end → Downgrade to Free
```

### 5. Payment Failure

```
Stripe retries: Day 1 → Day 3 → Day 7 → Day 14
Email alerts sent at each retry
After 14 days: Subscription cancelled → Downgrade to Free
```

### 6. Refund

```
User requests refund → Admin processes in Stripe dashboard → Webhook updates DB
```

---

## 🎟️ Coupon Codes

```http
# Apply coupon at checkout
POST /api/billing/checkout
{
  "priceId": "price_pro_monthly",
  "couponCode": "LAUNCH50"
}
```

**Coupon types:**
- **Percentage**: e.g., 50% off first month
- **Fixed amount**: e.g., $5 off
- **Duration**: Once / Repeating / Forever

---

## 📎 Related Docs

- [Stripe Integration](01-stripe-integration.md)
- [Subscription Tiers](02-subscription-tiers.md)
