# 🔄 Session Management

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses a dual-session model:
1. **NextAuth Sessions** - Standard NextAuth JWT sessions for web app
2. **ActiveSessions** - Custom detailed session tracking with device info

---

## 🔑 Session Types

### NextAuth Sessions (JWT)

Standard browser sessions managed by NextAuth.js:

```typescript
// NextAuth session object
interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: "user" | "admin";
    isVerified: boolean;
    subscriptionTier: SubscriptionTier;
  };
  expires: string; // ISO date
}
```

**Storage**: PostgreSQL (Session table via NextAuth adapter)
**Duration**: 30 days (configurable via `SESSION_MAX_AGE` env var)
**Cookie**: `next-auth.session-token` (HttpOnly, Secure, SameSite=Lax)

### ActiveSessions (Custom)

Detailed session tracking for security features:

```typescript
interface ActiveSession {
  id: string;
  userId: string;
  token: string;           // unique session identifier
  device: string;          // "Desktop", "Mobile", "Tablet"
  browser: string;         // "Chrome 120"
  os: string;              // "Windows 11"
  ipAddress: string;
  country: string;
  lastActiveAt: Date;
  expiresAt: Date;
  isCurrent: boolean;      // is this the current session?
}
```

---

## 🔑 Refresh Token System

For API clients (not browsers), we use a refresh token rotation system:

```
1. Login → access_token (15 min) + refresh_token (30 days)
2. access_token expires → use refresh_token to get new pair
3. refresh_token used → OLD token invalidated, NEW token issued
4. If refresh_token reuse detected → entire family revoked (security!)
```

---

## 👤 Session API

### Get Active Sessions

```http
GET /api/auth/sessions
Authorization: Bearer <token>
```

```json
{
  "data": [
    {
      "id": "clxyz",
      "device": "Desktop",
      "browser": "Chrome 120",
      "os": "Windows 11",
      "country": "IN",
      "lastActiveAt": "2026-03-15T10:00:00Z",
      "isCurrent": true
    }
  ]
}
```

### Revoke a Session

```http
DELETE /api/auth/sessions/:id
Authorization: Bearer <token>
```

### Revoke All Other Sessions

```http
DELETE /api/auth/sessions?all=true
Authorization: Bearer <token>
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Session invalidation on password change | All sessions revoked |
| New device login alert | Email notification sent |
| Concurrent session limit | Max 5 sessions (Pro: unlimited) |
| Session expiry cleanup | Nightly cron job |
| IP-based anomaly detection | Flag unusual locations |

---

## 📎 Related Docs

- [Authentication Flow](01-authentication-flow.md)
- [Two-Factor Auth](03-two-factor-auth.md)
- [Security Overview](../security/01-security-overview.md)
