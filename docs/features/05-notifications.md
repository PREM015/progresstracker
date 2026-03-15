# 🔔 Notifications System

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker delivers notifications through 3 channels: **In-App**, **Email**, and **Web Push**.

---

## 📡 Notification Channels

| Channel | Description | Setup |
|---------|-------------|-------|
| `IN_APP` | Bell icon in navbar | Automatic |
| `EMAIL` | Via Brevo email service | Email required |
| `PUSH` | Browser push notifications | User permission needed |

---

## 📧 Email Notifications (Brevo)

| Type | Trigger | Frequency |
|------|---------|-----------|
| Welcome | On registration | Once |
| Email Verification | On registration | On request |
| Goal Reminder | Daily 9AM if goal at risk | Daily |
| Streak At Risk | 8PM if no activity today | Daily |
| Achievement Unlocked | On unlock | Immediate |
| Weekly Report | Every Sunday | Weekly |
| Security Alert | New device login | Immediate |
| Payment Failed | Stripe webhook | Immediate |

---

## 🔔 Web Push Notifications

Requires user permission (stored as `PushSubscription` in DB):

```typescript
// Client: Request push permission
const registration = await navigator.serviceWorker.register('/sw.js');
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

// Send subscription to server
await fetch('/api/notifications/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription),
});
```

---

## ⚙️ Notification Preferences

Users control each notification type per channel:

```typescript
// NotificationPreferences model
interface NotificationPreferences {
  streakAtRisk: {
    inApp: boolean;  // default: true
    email: boolean;  // default: true
    push: boolean;   // default: true
  };
  goalReminders: { inApp: boolean; email: boolean; push: boolean; };
  achievements: { inApp: boolean; email: boolean; push: boolean; };
  weeklyReport: { inApp: boolean; email: boolean; };
  // ...
}
```

---

## 🔇 Unsubscribe

Users can unsubscribe from email notifications:

1. Via **Settings** → Notifications
2. Via **unsubscribe link** in email footer (one-click)

---

## 📎 Related Docs

- [Goals System](02-goals-system.md)
- [Streak System](03-streak-system.md)
- [Brevo Integration](../billing/01-stripe-integration.md)
