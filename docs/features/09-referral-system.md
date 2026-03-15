# 🎁 Referral System

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker has a referral program that rewards users for inviting new members.

---

## 🔗 How It Works

```
1. User gets unique referral code (stored on User.referralCode)
2. User shares referral link: vriddhi-app.vercel.app/register?ref=PREM015
3. New user registers with referral code
4. User.referredBy = referrer's userId
5. When referred user completes onboarding:
   → Referrer gets reward
   → Referred user gets signup bonus
```

---

## 🎁 Reward Types

| Reward | Value | Who Gets It |
|--------|-------|------------|
| Referrer credit | +30 days Pro | On referred user completing onboarding |
| Referred bonus | +7 days Pro | New user registering with referral code |
| Points | +150 points | Referrer, added to leaderboard score |

---

## 📊 Referral Stats

Users can view referral stats in **Settings → Referrals**:
- Total referrals sent
- Total conversions (signed up)
- Total rewards earned

---

## 📡 API

```http
# Get referral link and stats
GET /api/referrals/stats

# Get referral code (or generate new one)
GET /api/referrals/code
```

---

## 📎 Related Docs

- [Billing](../billing/02-subscription-tiers.md)
- [Core Features](01-core-features-overview.md)
