# 🔗 Database Relationships

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

This document explains the key relationships between Prisma models in ProgressTracker.

---

## 👤 User — Central Model

The `User` model is the hub of almost all relationships:

```
User
├── Account[]              (OAuth accounts - 1:many)
├── Session[]              (NextAuth sessions - 1:many)
├── ActiveSession[]        (Device sessions - 1:many)
├── RefreshToken[]         (JWT refresh tokens - 1:many)
├── TrackerEntry[]         (Activity log - 1:many)
├── DailyStats[]           (Daily aggregates - 1:many)
├── Goal[]                 (User goals - 1:many)
├── UserAchievement[]      (Earned badges - 1:many)
├── UserPlatform[]         (Connected platforms - 1:many)
├── Subscription           (Billing plan - 1:1)
├── UserSettings           (Preferences - 1:1)
├── NotificationPreferences (Notification settings - 1:1)
├── Notification[]         (Notifications - 1:many)
├── SyncLog[]              (Sync history - 1:many)
├── AuditLog[]             (Security audit - 1:many)
├── ApiKey[]               (API keys - 1:many)
└── referrals              (Self-referral - 1:many)
```

---

## 🔌 Platform Relationships

```
Platform
├── UserPlatform[]        (User connections - 1:many)
└── TrackerEntry[]        (Activity entries - 1:many, optional)

UserPlatform
├── User                  (Owner - many:1)
└── Platform              (Platform type - many:1)

TrackerEntry
├── User                  (Owner - many:1)
└── Platform?             (Source platform - many:1, optional)
```

---

## 🎯 Goals & Achievements

```
Goal
├── User                  (Owner - many:1)
├── GoalReminder[]        (Scheduled reminders - 1:many)
└── GoalHistory[]         (Status changes - 1:many)

Achievement
└── UserAchievement[]     (User instances - 1:many)

UserAchievement
├── User                  (Owner - many:1)
└── Achievement           (Badge type - many:1)
```

---

## 💳 Billing Relationships

```
Subscription
├── User                  (Owner - 1:1)
└── SubscriptionTier      (Plan details - many:1)

Invoice
├── User                  (Owner - many:1)
└── Subscription          (Related subscription - many:1)

CouponRedemption
├── User                  (Redeemer - many:1)
└── Coupon                (Code used - many:1)
```

---

## 🔴 Cascade Rules

| Relationship | On Delete |
|--------------|-----------|
| `User → Account` | Cascade (delete accounts when user deleted) |
| `User → Session` | Cascade |
| `User → TrackerEntry` | Cascade |
| `User → Goal` | Cascade |
| `User → UserAchievement` | Cascade |
| `User → Subscription` | Cascade |
| `User → AuditLog` | Set Null (keep logs) |
| `User → referrer` | Set Null (keep referral chain) |

---

## 📎 Related Docs

- [Schema Overview](01-schema-overview.md)
- [Enums Reference](03-enums-reference.md)
