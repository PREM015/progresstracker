# 📋 API Endpoints Reference

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0
> **Base URL**: `/api`

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Register new user |
| `POST` | `/auth/login` | ❌ | Login with email+password |
| `POST` | `/auth/logout` | ✅ | Logout current session |
| `POST` | `/auth/forgot-password` | ❌ | Send reset email |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |
| `POST` | `/auth/verify-email` | ❌ | Verify email address |
| `POST` | `/auth/resend-verification` | ✅ | Resend verification email |
| `GET` | `/auth/session` | ✅ | Get current session |
| `POST` | `/auth/2fa/setup` | ✅ | Initialize 2FA setup |
| `POST` | `/auth/2fa/verify` | ✅ | Verify TOTP code |
| `POST` | `/auth/2fa/disable` | ✅ | Disable 2FA |
| `GET` | `/auth/sessions` | ✅ | List active sessions |
| `DELETE` | `/auth/sessions/:id` | ✅ | Revoke a session |

---

## 📊 Tracker Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/tracker` | ✅ | Get tracker entries (paginated) |
| `POST` | `/tracker` | ✅ | Create new entry |
| `GET` | `/tracker/:id` | ✅ | Get single entry |
| `PUT` | `/tracker/:id` | ✅ | Update entry |
| `DELETE` | `/tracker/:id` | ✅ | Delete entry |
| `GET` | `/tracker/heatmap` | ✅ | Get heatmap data (365 days) |
| `GET` | `/tracker/daily` | ✅ | Get entries for specific date |

### `GET /api/tracker` Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 100) |
| `from` | date | -30d | Start date filter |
| `to` | date | today | End date filter |
| `platformId` | string | - | Filter by platform |
| `category` | string | - | Filter by category |

### `POST /api/tracker` Body

```json
{
  "platformId": "clxyz123",      // optional
  "category": "DSA",             // required
  "problemsSolved": 5,           // optional
  "commits": 3,                  // optional
  "timeSpentMinutes": 120,       // optional
  "date": "2026-03-15",          // optional (defaults to today)
  "notes": "Solved 5 problems",  // optional
  "difficulty": "MEDIUM",        // optional
  "isManual": true               // optional (defaults to false)
}
```

---

## 🔌 Platform Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/platforms` | ❌ | List all supported platforms |
| `GET` | `/platforms/connected` | ✅ | Get user's connected platforms |
| `POST` | `/platforms/:id/connect` | ✅ | Connect a platform |
| `PUT` | `/platforms/:id/config` | ✅ | Update platform config |
| `DELETE` | `/platforms/:id/disconnect` | ✅ | Disconnect platform |
| `POST` | `/platforms/:id/test` | ✅ | Test platform connection |

---

## 🔄 Sync Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sync` | ✅ | Sync all connected platforms |
| `POST` | `/sync/:platformId` | ✅ | Sync specific platform |
| `GET` | `/sync/status` | ✅ | Get sync status for all platforms |
| `GET` | `/sync/logs` | ✅ | Get sync history |

---

## 📈 Stats Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/stats` | ✅ | Get user overview stats |
| `GET` | `/stats/monthly` | ✅ | Monthly trend data |
| `GET` | `/stats/heatmap` | ✅ | Activity heatmap (365 days) |
| `GET` | `/stats/streak` | ✅ | Streak details |
| `GET` | `/stats/platforms` | ✅ | Per-platform breakdown |

---

## 🎯 Goals Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/goals` | ✅ | List user's goals |
| `POST` | `/goals` | ✅ | Create new goal |
| `GET` | `/goals/:id` | ✅ | Get goal details |
| `PUT` | `/goals/:id` | ✅ | Update goal |
| `DELETE` | `/goals/:id` | ✅ | Delete goal |
| `POST` | `/goals/:id/pause` | ✅ | Pause active goal |
| `POST` | `/goals/:id/resume` | ✅ | Resume paused goal |

### `POST /api/goals` Body

```json
{
  "title": "Solve 100 LeetCode Problems",
  "type": "MILESTONE",
  "metric": "PROBLEMS_SOLVED",
  "targetValue": 100,
  "platformId": "clxyz",
  "dueDate": "2026-06-30",
  "description": "Focus on medium difficulty"
}
```

---

## 🏆 Achievements Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/achievements` | ❌/✅ | List all achievements |
| `GET` | `/achievements/earned` | ✅ | User's earned achievements |
| `GET` | `/achievements/:id` | ❌ | Get achievement details |

---

## 🔔 Notifications Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/notifications` | ✅ | List notifications |
| `PUT` | `/notifications/:id/read` | ✅ | Mark as read |
| `PUT` | `/notifications/read-all` | ✅ | Mark all as read |
| `DELETE` | `/notifications/:id` | ✅ | Delete notification |
| `GET` | `/notifications/preferences` | ✅ | Get preferences |
| `PUT` | `/notifications/preferences` | ✅ | Update preferences |

---

## 💳 Billing Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/billing/subscription` | ✅ | Current subscription |
| `POST` | `/billing/checkout` | ✅ | Create Stripe checkout |
| `POST` | `/billing/portal` | ✅ | Open billing portal |
| `GET` | `/billing/invoices` | ✅ | Invoice history |
| `POST` | `/billing/webhook` | ❌ | Stripe webhook handler |

---

## 📤 Export Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/export` | ✅ | Request data export |
| `GET` | `/export/:id` | ✅ | Get export status |
| `GET` | `/export/:id/download` | ✅ | Download export file |

---

## 👤 User/Profile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/user/profile` | ✅ | Get own profile |
| `PUT` | `/user/profile` | ✅ | Update profile |
| `PUT` | `/user/settings` | ✅ | Update settings |
| `DELETE` | `/user/account` | ✅ | Delete account |
| `GET` | `/user/api-keys` | ✅ | List API keys |
| `POST` | `/user/api-keys` | ✅ | Create API key |
| `DELETE` | `/user/api-keys/:id` | ✅ | Delete API key |

---

## 🌐 Public Profile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/share/:slug` | ❌ | View public profile |
| `POST` | `/share` | ✅ | Create share link |
| `DELETE` | `/share/:id` | ✅ | Delete share link |

---

## 🏅 Leaderboard Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/leaderboard` | ❌ | Global leaderboard |
| `GET` | `/leaderboard/platform/:slug` | ❌ | Platform leaderboard |

---

## 📎 Related Docs

- [API Overview](01-api-overview.md)
- [Error Codes](03-error-codes.md)
- [Rate Limiting](04-rate-limiting.md)
